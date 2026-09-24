// Returns & exchanges: eligibility, pickup dispatch, proof-of-pickup and the
// delayed refund. Dispatch mirrors assignmentService (broadcast an offer to
// every nearby online partner, first accept wins, widen the radius on each
// wave) but offers live on the ReturnRequest itself so the order-dispatch
// pipeline is untouched.
import crypto from 'crypto';
import mongoose from 'mongoose';
import { ReturnRequest } from '../models/ReturnRequest.js';
import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { DeliveryEarning } from '../models/DeliveryEarning.js';
import { WalletTransaction } from '../models/Finance.js';
import { Notification, Settings } from '../models/Operations.js';
import { findCandidates, geoDistanceMeters } from './assignmentService.js';
import { sendToOwner } from './pushService.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { isPaymentsTestMode, razorpayInstance } from '../controllers/_shared.js';

let _io = null;
export const setReturnIo = (io) => { _io = io; };
const emit = (room, event, payload) => { try { _io?.to(room).emit(event, payload); } catch (_) {} };

// Single source of truth for the issue list — web, customer app and admin all
// render whatever this returns, so adding a reason is a backend-only change.
export const RETURN_REASONS = [
  { code: 'damaged', label: 'Item damaged or broken', types: ['return', 'exchange'] },
  { code: 'expired', label: 'Expired or near expiry', types: ['return', 'exchange'] },
  { code: 'not_fresh', label: 'Not fresh / spoiled', types: ['return', 'exchange'] },
  { code: 'wrong_item', label: 'Wrong item delivered', types: ['return', 'exchange'] },
  { code: 'packaging', label: 'Leaking or torn packaging', types: ['return', 'exchange'] },
  { code: 'quality', label: 'Poor quality', types: ['return', 'exchange'] },
  { code: 'other', label: 'Other', types: ['return', 'exchange'], requiresComment: true },
];

// Requests in these states no longer hold item quantity.
const RELEASED = ['Cancelled', 'Rejected'];
const MAX_PHOTOS = 4;

const getSettings = async () => (await Settings.findOne().lean()) || {};

export const returnConfig = async () => {
  const s = await getSettings();
  return {
    enabled: s.returnsEnabled !== false,
    windowHours: Number(s.returnWindowHours ?? 48),
    refundDelayHours: Number(s.refundDelayHours ?? 24),
    maxPhotos: MAX_PHOTOS,
    reasons: RETURN_REASONS,
  };
};

const itemKey = (it) => String(it.productId || it.id || it.name || '');
const itemQty = (it) => Number(it.quantity ?? it.qty ?? 1) || 1;
const isCodOrder = (order) => /cash|cod/i.test(order.paymentMethod || '');

const notifyAdmins = async (title, body) => {
  try {
    const admins = await User.find({ role: { $in: ['Admin', 'Manager'] } }).select('_id');
    await Notification.insertMany(admins.map((a) => ({ userId: String(a._id), title, body, type: 'Order' })));
  } catch (_) {}
};

const notifyCustomer = async (rr, title, body) => {
  try {
    await Notification.create({ userId: rr.customerId, title, body, type: 'Order' });
    await sendToOwner(rr.customerId, {
      title, body, data: { type: 'return_update', returnId: rr.returnId, orderId: rr.orderId, status: rr.status },
    });
  } catch (_) {}
};

/** Push the latest state to the customer (order + return rooms) and ops. */
export const broadcastReturn = (rr) => {
  const payload = {
    returnId: rr.returnId, orderId: rr.orderId, type: rr.type, status: rr.status,
    refund: rr.refund, partnerName: rr.partnerName ? String(rr.partnerName).split(' ')[0] : null,
    timeline: rr.timeline, at: new Date().toISOString(),
  };
  emit(rr.orderId, 'return_status_update', payload);
  emit(rr.returnId, 'return_status_update', payload);
  emit('admin_fleet', 'return_update', payload);
};

const pushTimeline = (rr, status, note) => rr.timeline.push({ status, note, at: new Date() });

const freePartner = async (userId, returnId) => {
  if (!userId) return;
  const p = await DeliveryPartner.findOne({ userId });
  if (!p) return;
  p.activeOrderIds = (p.activeOrderIds || []).filter((id) => id !== returnId);
  p.availability = !p.isOnline ? 'offline'
    : (p.activeOrderIds.length >= (p.maxConcurrent || 1) ? 'busy' : 'available');
  await p.save();
};

const occupyPartner = async (userId, returnId) => {
  const p = await DeliveryPartner.findOne({ userId });
  if (!p) return null;
  if (!(p.activeOrderIds || []).includes(returnId)) p.activeOrderIds.push(returnId);
  p.availability = !p.isOnline ? 'offline'
    : (p.activeOrderIds.length >= (p.maxConcurrent || 1) ? 'busy' : 'available');
  await p.save();
  return p;
};

/** Upload data-URI photos; keep the raw data URI if Cloudinary isn't configured. */
export const storePhotos = async (photos, folder) => {
  const list = (Array.isArray(photos) ? photos : []).filter((p) => typeof p === 'string' && p).slice(0, MAX_PHOTOS);
  const out = [];
  for (const p of list) {
    if (/^https?:\/\//i.test(p)) { out.push(p); continue; }
    if (!p.startsWith('data:image/')) continue;
    try {
      const up = await uploadToCloudinary(p, folder);
      out.push(up.url);
    } catch (_) {
      // ~2 MB cap on inline fallbacks so a misconfigured Cloudinary can't bloat Mongo.
      if (p.length <= 2_800_000) out.push(p);
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/**
 * What the customer may still return/exchange on this order.
 * { eligible, reason?, windowEndsAt, items: [{ key, name, image, price, quantity, returnableQty }], requests }
 */
export const eligibilityFor = async (order) => {
  const cfg = await returnConfig();
  const requests = await ReturnRequest.find({ orderId: order.orderId }).sort({ createdAt: -1 }).lean();
  const deliveredAt = order.deliveredAt
    || order.trackingTimeline?.find((t) => t.status === 'Delivered')?.at
    || null;
  const windowEndsAt = deliveredAt ? new Date(new Date(deliveredAt).getTime() + cfg.windowHours * 3600000) : null;

  const used = {};
  for (const r of requests) {
    if (RELEASED.includes(r.status)) continue;
    for (const it of r.items) used[it.productId] = (used[it.productId] || 0) + it.quantity;
  }
  const items = (order.items || []).map((it) => {
    const key = itemKey(it);
    const quantity = itemQty(it);
    return {
      key, name: it.name, image: it.image, weightSpec: it.weightSpec, price: Number(it.price) || 0,
      quantity, returnableQty: Math.max(0, quantity - (used[key] || 0)),
    };
  });

  let reason = null;
  if (!cfg.enabled) reason = 'Returns are currently unavailable.';
  else if (order.status !== 'Delivered') reason = 'Returns open once the order is delivered.';
  else if (windowEndsAt && windowEndsAt.getTime() < Date.now()) reason = `The ${cfg.windowHours}-hour return window has closed.`;
  else if (!items.some((i) => i.returnableQty > 0)) reason = 'All items on this order already have a return or exchange.';

  return {
    eligible: !reason,
    reason,
    windowHours: cfg.windowHours,
    windowEndsAt,
    refundDelayHours: cfg.refundDelayHours,
    refundMethods: isCodOrder(order) || order.paymentStatus !== 'Paid' ? ['wallet'] : ['original', 'wallet'],
    items,
    requests: requests.map((r) => customerView(r)),
  };
};

const newReturnId = () => `RT-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7)}`;
const newOtp = () => String(crypto.randomInt(1000, 10000));

/**
 * Create a return/exchange for `order` owned by `customer`.
 * body: { type, items: [{ key|productId|id, quantity }], reasonCode, comment, photos[], refundMethod }
 * Returns { rr } or { error: [status, message] }.
 */
export const createReturn = async ({ order, customer, body }) => {
  const elig = await eligibilityFor(order);
  if (!elig.eligible) return { error: [409, elig.reason] };

  const type = body.type === 'exchange' ? 'exchange' : body.type === 'return' ? 'return' : null;
  if (!type) return { error: [400, 'Choose return or exchange'] };

  const reason = RETURN_REASONS.find((r) => r.code === body.reasonCode && r.types.includes(type));
  if (!reason) return { error: [400, 'Select an issue from the list'] };
  const comment = String(body.comment || '').trim().slice(0, 500);
  if (reason.requiresComment && comment.length < 5) return { error: [400, 'Please describe the issue'] };

  const byKey = Object.fromEntries(elig.items.map((i) => [i.key, i]));
  const picked = [];
  for (const raw of Array.isArray(body.items) ? body.items : []) {
    const key = String(raw.key || raw.productId || raw.id || raw.name || '');
    const src = byKey[key];
    const qty = Math.floor(Number(raw.quantity ?? raw.qty ?? 0));
    if (!src || qty < 1) continue;
    if (qty > src.returnableQty) return { error: [400, `Only ${src.returnableQty} of "${src.name}" can be returned`] };
    picked.push({ productId: key, name: src.name, image: src.image, weightSpec: src.weightSpec, price: src.price, quantity: qty });
  }
  if (!picked.length) return { error: [400, 'Select at least one item'] };

  const photos = await storePhotos(body.photos, 'freshcart/return-evidence');

  // Refund = what was paid for those units, capped at what's left of the
  // order total after earlier refunds (delivery/handling fees aren't refunded).
  let refundAmount = 0;
  let refundMethod = 'wallet';
  if (type === 'return') {
    const gross = picked.reduce((s, i) => s + i.price * i.quantity, 0);
    const prior = await ReturnRequest.aggregate([
      { $match: { orderId: order.orderId, type: 'return', status: { $nin: RELEASED } } },
      { $group: { _id: null, sum: { $sum: '$refund.amount' } } },
    ]);
    const remaining = Math.max(0, Number(order.totalAmount || 0) - (prior[0]?.sum || 0));
    refundAmount = Math.round(Math.min(gross, remaining) * 100) / 100;
    refundMethod = elig.refundMethods.includes(body.refundMethod) ? body.refundMethod : elig.refundMethods[0];
  }

  const s = await getSettings();
  const store = order.pickup?.lat != null ? order.pickup : s.storeOrigin || null;
  const rr = await ReturnRequest.create({
    returnId: newReturnId(),
    orderId: order.orderId,
    customerId: order.customerId || customer.customerId,
    customerName: order.customerName || customer.name,
    customerPhone: order.customerPhone,
    type,
    items: picked,
    reasonCode: reason.code,
    reasonLabel: reason.label,
    comment: comment || undefined,
    photos,
    pickupAddress: order.deliveryAddress,
    pickupLocation: order.deliveryLocation?.lat != null ? order.deliveryLocation : (store ? { lat: store.lat, lng: store.lng } : undefined),
    store: store ? { name: store.name, lat: store.lat, lng: store.lng } : undefined,
    pickupOtp: newOtp(),
    refund: { amount: refundAmount, method: refundMethod, status: 'none' },
    timeline: [{
      status: 'Requested',
      note: `${type === 'return' ? 'Return' : 'Exchange'} requested: ${reason.label}${comment ? ` — ${comment}` : ''}`,
    }],
  });

  await Order.updateOne({ orderId: order.orderId }, {
    $push: { trackingTimeline: { status: 'Delivered', note: `${type === 'return' ? 'Return' : 'Exchange'} ${rr.returnId} requested` } },
  }).catch(() => {});

  broadcastReturn(rr);
  notifyAdmins(`New ${type} request`, `${rr.returnId} for order ${order.orderId}: ${reason.label}.`);

  if (s.autoAssignEnabled !== false) tryAssignReturn(rr.returnId).catch(() => {});
  else await markStalled(rr.returnId, 'auto-dispatch is off');

  return { rr };
};

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

// Return: the partner starts at the customer. Exchange: they first collect the
// replacement at the store, so rank partners from there.
const dispatchOrigin = (rr) => (rr.type === 'exchange' && rr.store?.lat != null ? rr.store : rr.pickupLocation);

const offerPayload = (rr, offer) => ({
  kind: 'return',
  returnId: rr.returnId,
  offerId: String(offer._id),
  orderId: rr.orderId,
  type: rr.type,
  attempt: offer.attempt,
  expiresAt: offer.expiresAt,
  distanceMeters: offer.distanceMeters,
  itemCount: rr.items.reduce((s, i) => s + i.quantity, 0),
  items: rr.items.map((i) => ({ name: i.name, quantity: i.quantity })),
  reason: rr.reasonLabel,
  pickupAddress: rr.pickupAddress,
  pickup: rr.pickupLocation || null,
  store: rr.store || null,
});

const markStalled = async (returnId, why) => {
  const rr = await ReturnRequest.findOneAndUpdate(
    { returnId, partnerUserId: null, status: 'Requested' },
    { $set: { dispatchStalled: true } },
    { new: true }
  );
  if (!rr) return;
  emit('admin_fleet', 'return_stalled', { returnId, orderId: rr.orderId, reason: why });
  await notifyAdmins('Return pickup needs a partner', `${returnId}: ${why}. Assign a partner manually.`);
};

/**
 * Broadcast pickup offers to the nearest wave of online partners with spare
 * capacity. Idempotent: bails if assigned or an offer is still live.
 */
export const tryAssignReturn = async (returnId) => {
  const rr = await ReturnRequest.findOne({ returnId });
  if (!rr || rr.partnerUserId || rr.status !== 'Requested') return { ok: false, code: 'not_dispatchable' };
  const now = Date.now();
  if (rr.offers.some((o) => o.status === 'offered' && (!o.expiresAt || o.expiresAt.getTime() > now))) {
    return { ok: false, code: 'offer_pending' };
  }

  const s = await getSettings();
  const timeoutSec = Math.max(30, s.offerTimeoutSec || 25) * 2; // pickups aren't time-critical — give partners longer
  const maxAttempts = s.maxOfferAttempts || 5;
  const baseRadius = s.assignRadiusKm || 6;
  const attempt = rr.offers.reduce((m, o) => Math.max(m, o.attempt || 1), 0) + 1;
  if (attempt > maxAttempts) {
    await markStalled(returnId, `no partner accepted after ${maxAttempts} attempts`);
    return { ok: false, code: 'exhausted' };
  }

  const origin = dispatchOrigin(rr);
  // attempt 0 = offers from before an admin requeue; those partners get another chance.
  const excludeUserIds = [...new Set(rr.offers.filter((o) => o.attempt > 0).map((o) => String(o.partnerUserId)))];
  let candidates = await findCandidates({ pickup: origin, excludeUserIds, radiusKm: baseRadius * Math.min(attempt, 3) });
  candidates = candidates.filter((c) => (c.partner.activeOrderIds || []).length < (c.partner.maxConcurrent || 1));
  if (!candidates.length) {
    await markStalled(returnId, 'no available partner nearby');
    return { ok: false, code: 'no_candidate' };
  }

  const expiresAt = new Date(now + timeoutSec * 1000);
  const offers = candidates.slice(0, Math.max(1, s.maxFanout || 100)).map((c) => ({
    _id: new mongoose.Types.ObjectId(),
    partnerUserId: c.user._id,
    partnerName: c.user.name,
    attempt,
    distanceMeters: c.distance,
    offeredAt: new Date(now),
    expiresAt,
    source: 'auto',
  }));
  const updated = await ReturnRequest.findOneAndUpdate(
    { returnId, partnerUserId: null, status: 'Requested' },
    { $push: { offers: { $each: offers } }, $set: { dispatchStalled: false } },
    { new: true }
  );
  if (!updated) return { ok: false, code: 'not_dispatchable' };

  for (const o of offers) sendOffer(updated, o, timeoutSec);
  emit('admin_fleet', 'return_update', { returnId, status: updated.status, offered: offers.length, attempt });
  return { ok: true, count: offers.length, attempt };
};

const sendOffer = (rr, offer, timeoutSec) => {
  const room = 'partner:' + String(offer.partnerUserId);
  const label = rr.type === 'exchange' ? 'exchange' : 'return';
  emit(room, 'return_offer', offerPayload(rr, offer));
  Notification.create({
    userId: String(offer.partnerUserId),
    title: `New ${label} pickup`,
    body: `${rr.returnId} — ${rr.items.length} item(s). Respond within ${timeoutSec}s.`,
    type: 'Offer',
  }).catch(() => {});
  sendToOwner(offer.partnerUserId, {
    title: `New ${label} pickup`,
    body: `${rr.returnId} near ${String(rr.pickupAddress || '').slice(0, 60)}. Tap to respond.`,
    data: { type: 'return_offer', returnId: rr.returnId, offerId: String(offer._id) },
  }).catch(() => {});
};

/** Atomic accept — first partner wins, every other live offer is revoked. */
export const acceptReturnOffer = async ({ returnId, user }) => {
  const now = new Date();
  const rr = await ReturnRequest.findOneAndUpdate(
    {
      returnId, partnerUserId: null, status: 'Requested',
      offers: { $elemMatch: { partnerUserId: user._id, status: 'offered', expiresAt: { $gt: now } } },
    },
    {
      $set: {
        partnerUserId: user._id, partnerName: user.name, status: 'Assigned', assignedAt: now,
        dispatchStalled: false, 'offers.$.status': 'accepted', 'offers.$.respondedAt': now,
      },
      $push: { timeline: { status: 'Assigned', note: `Pickup assigned to ${String(user.name || 'partner').split(' ')[0]}`, at: now } },
    },
    { new: true }
  );
  if (!rr) return { ok: false, code: 'offer_gone', message: 'This pickup is no longer available.' };

  const losers = rr.offers.filter((o) => o.status === 'offered');
  if (losers.length) {
    await ReturnRequest.updateOne(
      { returnId },
      { $set: { 'offers.$[o].status': 'cancelled', 'offers.$[o].respondedAt': now } },
      { arrayFilters: [{ 'o.status': 'offered' }] }
    );
    for (const o of losers) emit('partner:' + String(o.partnerUserId), 'return_offer_revoked', { returnId, reason: 'taken' });
  }
  await occupyPartner(user._id, returnId);

  broadcastReturn(rr);
  notifyCustomer(rr, 'Pickup partner assigned',
    `${String(user.name || 'A partner').split(' ')[0]} will collect your ${rr.type} ${rr.returnId}. Share pickup code ${rr.pickupOtp} at the door.`);
  return { ok: true, rr };
};

export const rejectReturnOffer = async ({ returnId, user, reason }) => {
  const now = new Date();
  const rr = await ReturnRequest.findOneAndUpdate(
    { returnId, offers: { $elemMatch: { partnerUserId: user._id, status: 'offered' } } },
    { $set: { 'offers.$.status': 'rejected', 'offers.$.respondedAt': now } },
    { new: true }
  );
  if (!rr) return { ok: false, code: 'offer_gone' };
  if (!rr.offers.some((o) => o.status === 'offered')) await tryAssignReturn(returnId).catch(() => {});
  return { ok: true };
};

/** Sweeper — expire stale offers and roll to the next (wider) wave. */
export const expireStaleReturnOffers = async () => {
  const now = new Date();
  const stale = await ReturnRequest.find({
    status: 'Requested',
    offers: { $elemMatch: { status: 'offered', expiresAt: { $lt: now } } },
  }).select('returnId offers');
  for (const rr of stale) {
    const expired = rr.offers.filter((o) => o.status === 'offered' && o.expiresAt && o.expiresAt < now);
    await ReturnRequest.updateOne(
      { returnId: rr.returnId },
      { $set: { 'offers.$[o].status': 'expired', 'offers.$[o].respondedAt': now } },
      { arrayFilters: [{ 'o.status': 'offered', 'o.expiresAt': { $lt: now } }] }
    );
    for (const o of expired) emit('partner:' + String(o.partnerUserId), 'return_offer_revoked', { returnId: rr.returnId, reason: 'expired' });
    await tryAssignReturn(rr.returnId).catch(() => {});
  }
  return stale.length;
};

/** Cancel every live offer (customer cancel / admin reject / manual assign). */
const revokeLiveOffers = async (rr, reason) => {
  const live = rr.offers.filter((o) => o.status === 'offered');
  if (!live.length) return;
  await ReturnRequest.updateOne(
    { returnId: rr.returnId },
    { $set: { 'offers.$[o].status': 'cancelled', 'offers.$[o].respondedAt': new Date() } },
    { arrayFilters: [{ 'o.status': 'offered' }] }
  );
  for (const o of live) emit('partner:' + String(o.partnerUserId), 'return_offer_revoked', { returnId: rr.returnId, reason });
};

/** Admin: hand the pickup straight to a partner (no offer round-trip). */
export const manualAssignReturn = async ({ rr, partnerUser, by }) => {
  if (!['Requested', 'Pickup Failed'].includes(rr.status)) return { error: [409, `Return is ${rr.status}`] };
  await revokeLiveOffers(rr, 'assigned manually');
  if (rr.partnerUserId) await freePartner(rr.partnerUserId, rr.returnId);
  const fresh = await ReturnRequest.findOne({ returnId: rr.returnId });
  fresh.partnerUserId = partnerUser._id;
  fresh.partnerName = partnerUser.name;
  fresh.status = 'Assigned';
  fresh.assignedAt = new Date();
  fresh.dispatchStalled = false;
  fresh.failureReason = undefined;
  fresh.offers.push({ partnerUserId: partnerUser._id, partnerName: partnerUser.name, status: 'accepted', respondedAt: new Date(), source: 'manual' });
  pushTimeline(fresh, 'Assigned', `Pickup assigned to ${String(partnerUser.name).split(' ')[0]} by ${by}`);
  await fresh.save();
  await occupyPartner(partnerUser._id, fresh.returnId);
  emit('partner:' + String(partnerUser._id), 'return_assigned', { returnId: fresh.returnId });
  sendToOwner(partnerUser._id, {
    title: `${fresh.type === 'exchange' ? 'Exchange' : 'Return'} pickup assigned`,
    body: `${fresh.returnId} was assigned to you by ops.`,
    data: { type: 'return_assigned', returnId: fresh.returnId },
  }).catch(() => {});
  broadcastReturn(fresh);
  notifyCustomer(fresh, 'Pickup partner assigned', `Your pickup code for ${fresh.returnId} is ${fresh.pickupOtp}.`);
  return { rr: fresh };
};

/** Admin: put a failed/stalled request back into automatic dispatch. */
export const requeueReturn = async (rr, by) => {
  if (!['Requested', 'Pickup Failed'].includes(rr.status)) return { error: [409, `Return is ${rr.status}`] };
  if (rr.partnerUserId) await freePartner(rr.partnerUserId, rr.returnId);
  await revokeLiveOffers(rr, 'requeued');
  const fresh = await ReturnRequest.findOne({ returnId: rr.returnId });
  fresh.status = 'Requested';
  fresh.partnerUserId = null;
  fresh.partnerName = undefined;
  fresh.dispatchStalled = false;
  // A requeue starts a fresh round of waves — mark old offers as history only.
  fresh.offers.forEach((o) => { if (o.status !== 'accepted') o.attempt = 0; });
  pushTimeline(fresh, 'Requested', `Pickup requeued by ${by}`);
  await fresh.save();
  broadcastReturn(fresh);
  const result = await tryAssignReturn(fresh.returnId);
  return { rr: await ReturnRequest.findOne({ returnId: fresh.returnId }), dispatch: result };
};

// ---------------------------------------------------------------------------
// Terminal transitions
// ---------------------------------------------------------------------------

export const cancelReturn = async (rr, note) => {
  if (!['Requested', 'Assigned'].includes(rr.status)) return { error: [409, `A ${rr.status.toLowerCase()} request can no longer be cancelled`] };
  await revokeLiveOffers(rr, 'cancelled');
  const partnerUserId = rr.partnerUserId;
  const fresh = await ReturnRequest.findOne({ returnId: rr.returnId });
  fresh.status = 'Cancelled';
  pushTimeline(fresh, 'Cancelled', note || 'Cancelled by customer');
  await fresh.save();
  if (partnerUserId) {
    await freePartner(partnerUserId, fresh.returnId);
    emit('partner:' + String(partnerUserId), 'return_cancelled', { returnId: fresh.returnId });
  }
  broadcastReturn(fresh);
  return { rr: fresh };
};

export const rejectReturn = async (rr, reason, by) => {
  if (!['Requested', 'Assigned', 'Arrived', 'Pickup Failed'].includes(rr.status)) {
    return { error: [409, `A ${rr.status.toLowerCase()} request can't be rejected`] };
  }
  await revokeLiveOffers(rr, 'rejected');
  const partnerUserId = rr.partnerUserId;
  const fresh = await ReturnRequest.findOne({ returnId: rr.returnId });
  fresh.status = 'Rejected';
  fresh.rejectionReason = reason;
  pushTimeline(fresh, 'Rejected', `${reason}${by ? ` (${by})` : ''}`);
  await fresh.save();
  if (partnerUserId) {
    await freePartner(partnerUserId, fresh.returnId);
    emit('partner:' + String(partnerUserId), 'return_cancelled', { returnId: fresh.returnId });
  }
  broadcastReturn(fresh);
  notifyCustomer(fresh, `${fresh.type === 'exchange' ? 'Exchange' : 'Return'} request declined`, `${fresh.returnId}: ${reason}`);
  return { rr: fresh };
};

// ---------------------------------------------------------------------------
// Partner steps
// ---------------------------------------------------------------------------

export const partnerArrived = async (rr) => {
  if (rr.status === 'Arrived') return { rr };
  if (rr.status !== 'Assigned') return { error: [409, `Cannot mark arrived from "${rr.status}"`] };
  rr.status = 'Arrived';
  rr.arrivedAt = new Date();
  pushTimeline(rr, 'Arrived', 'Pickup partner has arrived');
  await rr.save();
  broadcastReturn(rr);
  notifyCustomer(rr, 'Pickup partner has arrived', `Share code ${rr.pickupOtp} to hand over ${rr.returnId}.`);
  return { rr };
};

/** Collect with proof: customer OTP + at least one photo + items verified. */
export const partnerCollect = async (rr, { otp, photos, itemsVerified, note }) => {
  if (rr.status === 'Picked Up') return { rr };
  if (!['Assigned', 'Arrived'].includes(rr.status)) return { error: [409, `Cannot collect from "${rr.status}"`] };
  if (itemsVerified !== true && itemsVerified !== 'true') {
    return { error: [400, 'Confirm the items match the request before collecting'] };
  }
  if ((rr.otpAttempts || 0) >= 5) return { error: [400, 'Too many wrong codes. Mark the pickup failed or contact support.'], code: 'otp_locked' };
  if (String(otp || '').trim() !== rr.pickupOtp) {
    rr.otpAttempts = (rr.otpAttempts || 0) + 1;
    await rr.save();
    return { error: [400, `Incorrect pickup code. ${Math.max(0, 5 - rr.otpAttempts)} attempt(s) left.`], code: 'otp_wrong' };
  }
  const stored = await storePhotos(photos, 'freshcart/return-proof');
  if (!stored.length) return { error: [400, 'Add at least one photo of the collected item(s) as proof'] };

  const now = new Date();
  rr.status = 'Picked Up';
  rr.pickedUpAt = now;
  rr.proofPhotos = stored;
  rr.proofNote = String(note || '').trim().slice(0, 300) || undefined;
  rr.pickupOtp = undefined;

  let customerMsg;
  if (rr.type === 'return' && rr.refund.amount > 0) {
    const { refundDelayHours } = await returnConfig();
    rr.refund.status = 'scheduled';
    rr.refund.dueAt = new Date(now.getTime() + refundDelayHours * 3600000);
    pushTimeline(rr, 'Picked Up', `Item(s) collected. Refund of ₹${rr.refund.amount} scheduled within ${refundDelayHours} hours.`);
    customerMsg = `We collected ${rr.returnId}. ₹${rr.refund.amount} will be refunded to your ${rr.refund.method === 'wallet' ? 'FreshCart wallet' : 'original payment method'} within ${refundDelayHours} hours.`;
  } else if (rr.type === 'exchange') {
    pushTimeline(rr, 'Picked Up', 'Item(s) collected and replacement handed over.');
    customerMsg = `Exchange ${rr.returnId} done — your replacement has been handed over.`;
  } else {
    pushTimeline(rr, 'Picked Up', 'Item(s) collected.');
    customerMsg = `We collected ${rr.returnId}.`;
  }
  await rr.save();
  broadcastReturn(rr);
  notifyCustomer(rr, rr.type === 'exchange' ? 'Exchange completed' : 'Return picked up', customerMsg);
  return { rr };
};

export const partnerFail = async (rr, reason) => {
  if (!['Assigned', 'Arrived'].includes(rr.status)) return { error: [409, `Cannot fail from "${rr.status}"`] };
  const partnerUserId = rr.partnerUserId;
  rr.status = 'Pickup Failed';
  rr.failureReason = reason;
  pushTimeline(rr, 'Pickup Failed', reason);
  await rr.save();
  await freePartner(partnerUserId, rr.returnId);
  broadcastReturn(rr);
  notifyAdmins('Return pickup failed', `${rr.returnId}: ${reason}. Requeue or assign manually.`);
  notifyCustomer(rr, 'Pickup attempt failed', `We couldn't collect ${rr.returnId}: ${reason}. We'll reschedule shortly.`);
  return { rr };
};

/** Dropped at the store — frees the partner and books their earning. */
export const partnerComplete = async (rr, by = 'partner') => {
  if (rr.status === 'Completed') return { rr };
  if (rr.status !== 'Picked Up') return { error: [409, `Cannot complete from "${rr.status}"`] };
  rr.status = 'Completed';
  rr.completedAt = new Date();
  pushTimeline(rr, 'Completed', by === 'partner' ? 'Item(s) received at the store' : `Marked received at the store by ${by}`);
  await rr.save();
  await freePartner(rr.partnerUserId, rr.returnId);
  await recordReturnEarning(rr);
  broadcastReturn(rr);
  return { rr };
};

const recordReturnEarning = async (rr) => {
  try {
    if (!rr.partnerUserId) return;
    const s = await getSettings();
    const baseFee = Number(s.deliveryBaseFee ?? 20);
    const perKm = Number(s.deliveryPerKmFee ?? 6);
    const leg = geoDistanceMeters(rr.store, rr.pickupLocation) || 0;
    // Return: customer → store. Exchange: store → customer → store.
    const meters = rr.type === 'exchange' ? leg * 2 : leg;
    const distanceKm = Math.round((meters / 1000) * 10) / 10;
    const distanceFee = Math.round(distanceKm * perKm);
    // Keyed by returnId so it rides the normal settlement flow without ever
    // colliding with the original order's delivery earning.
    await DeliveryEarning.updateOne(
      { orderId: rr.returnId },
      { $setOnInsert: { partnerUserId: rr.partnerUserId, baseFee, distanceKm, distanceFee, tips: 0, total: baseFee + distanceFee, status: 'pending', earnedAt: rr.completedAt || new Date() } },
      { upsert: true }
    );
  } catch (_) { /* earnings never block completion */ }
};

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

const payRefund = async (rr) => {
  const amount = Number(rr.refund.amount || 0);
  if (rr.refund.method === 'original') {
    const order = await Order.findOne({ orderId: rr.orderId }).select('paymentId').lean();
    if (!isPaymentsTestMode() && order?.paymentId && !/^(tip_)?sim|wallet/i.test(order.paymentId)) {
      const r = await razorpayInstance.payments.refund(order.paymentId, {
        amount: Math.round(amount * 100),
        notes: { returnId: rr.returnId, orderId: rr.orderId },
      });
      return { reference: r?.id || `rfnd_${rr.returnId}` };
    }
    // TEST/MOCK: no live gateway configured — simulate the provider refund.
    return { reference: `MOCK_REFUND_${rr.returnId}_${Date.now()}` };
  }
  const cust = await Customer.findOne({ customerId: rr.customerId });
  if (!cust) throw new Error('Customer account not found for wallet refund');
  cust.walletBalance = (cust.walletBalance || 0) + amount;
  await cust.save();
  const txn = await WalletTransaction.create({
    customerId: cust.customerId, amount, type: 'Credit',
    description: `Refund for return ${rr.returnId} (order ${rr.orderId})`,
  });
  return { reference: `WALLET_${txn._id}` };
};

/**
 * Pay one refund. The scheduled → processing flip is the idempotency lock, so
 * the sweeper and an admin "refund now" can never both pay the same return.
 */
export const processRefund = async (returnId, { force = false } = {}) => {
  const filter = { returnId, type: 'return', 'refund.status': { $in: force ? ['scheduled', 'failed'] : ['scheduled'] } };
  if (!force) filter['refund.dueAt'] = { $lte: new Date() };
  const rr = await ReturnRequest.findOneAndUpdate(filter, { $set: { 'refund.status': 'processing' } }, { new: true });
  if (!rr) return { ok: false, code: 'not_due' };
  try {
    const { reference } = await payRefund(rr);
    rr.refund.status = 'processed';
    rr.refund.processedAt = new Date();
    rr.refund.reference = reference;
    rr.refund.failureReason = undefined;
    pushTimeline(rr, rr.status, `Refund of ₹${rr.refund.amount} transferred to ${rr.refund.method === 'wallet' ? 'FreshCart wallet' : 'original payment method'}`);
    await rr.save();
    broadcastReturn(rr);
    notifyCustomer(rr, 'Refund processed', `₹${rr.refund.amount} for ${rr.returnId} has been refunded to your ${rr.refund.method === 'wallet' ? 'FreshCart wallet' : 'original payment method'}.`);
    return { ok: true, rr };
  } catch (err) {
    rr.refund.status = 'failed';
    rr.refund.failureReason = err.message || 'Refund failed';
    await rr.save();
    notifyAdmins('Refund failed', `${rr.returnId}: ${rr.refund.failureReason}. Retry from Returns.`);
    return { ok: false, code: 'failed', message: rr.refund.failureReason, rr };
  }
};

/** Sweeper body — pays every refund whose 24h window has elapsed. */
export const processDueRefunds = async () => {
  const due = await ReturnRequest.find({ type: 'return', 'refund.status': 'scheduled', 'refund.dueAt': { $lte: new Date() } })
    .select('returnId').limit(50).lean();
  for (const d of due) await processRefund(d.returnId).catch(() => {});
  return due.length;
};

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/** Customer-safe projection: no offers; pickup code only while it's needed. */
export const customerView = (doc) => {
  const r = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const showOtp = ['Requested', 'Assigned', 'Arrived'].includes(r.status);
  return {
    returnId: r.returnId,
    orderId: r.orderId,
    type: r.type,
    status: r.status,
    items: r.items,
    reasonCode: r.reasonCode,
    reasonLabel: r.reasonLabel,
    comment: r.comment,
    photos: r.photos || [],
    pickupAddress: r.pickupAddress,
    pickupOtp: showOtp ? r.pickupOtp : undefined,
    partnerName: r.partnerName ? String(r.partnerName).split(' ')[0] : null,
    proofPhotos: r.proofPhotos || [],
    rejectionReason: r.rejectionReason,
    failureReason: r.failureReason,
    refund: r.type === 'return' ? r.refund : undefined,
    timeline: r.timeline || [],
    createdAt: r.createdAt,
    pickedUpAt: r.pickedUpAt,
    completedAt: r.completedAt,
  };
};

/** Partner projection: no customer OTP; full phone only once assigned. */
export const partnerView = (doc) => {
  const r = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const { pickupOtp, offers, otpAttempts, ...rest } = r;
  return { ...rest, kind: 'return' };
};

export const returnService = {
  RETURN_REASONS, returnConfig, eligibilityFor, createReturn, tryAssignReturn, acceptReturnOffer,
  rejectReturnOffer, expireStaleReturnOffers, manualAssignReturn, requeueReturn, cancelReturn,
  rejectReturn, partnerArrived, partnerCollect, partnerFail, partnerComplete, processRefund,
  processDueRefunds, customerView, partnerView, setReturnIo,
};
