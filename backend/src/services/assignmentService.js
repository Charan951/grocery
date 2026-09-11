import { Assignment } from '../models/Assignment.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { Notification, Settings } from '../models/Operations.js';
import { DeliveryZone } from '../models/DeliveryZone.js';
import { sendToOwner } from './pushService.js';

const CANDIDATE_LIMIT = 10;

let _io = null;
export const setIo = (io) => { _io = io; };
const emit = (room, event, payload) => { try { _io?.to(room).emit(event, payload); } catch (_) {} };

export const geoDistanceMeters = (a, b) => {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
};

const availabilityFor = (partner) =>
  !partner.isOnline
    ? 'offline'
    : (partner.activeOrderIds || []).length >= (partner.maxConcurrent || 1)
      ? 'busy'
      : 'available';

const fleetPayload = (partner, name) => ({
  userId: String(partner.userId),
  name,
  isOnline: partner.isOnline,
  availability: partner.availability,
  activeOrderIds: partner.activeOrderIds || [],
  location: partner.currentLocation?.coordinates
    ? { lng: partner.currentLocation.coordinates[0], lat: partner.currentLocation.coordinates[1] }
    : null,
  locationUpdatedAt: partner.locationUpdatedAt,
});

const notifyAdmins = async (title, body, type = 'Order') => {
  try {
    const admins = await User.find({ role: { $in: ['Admin', 'Manager'] } }).select('_id');
    await Notification.insertMany(
      admins.map((a) => ({ userId: String(a._id), title, body, type }))
    );
  } catch (_) {}
};

const orderOfferPayload = (order, assignment) => ({
  assignmentId: String(assignment._id),
  orderId: order.orderId,
  attempt: assignment.attempt,
  expiresAt: assignment.expiresAt,
  distanceMeters: assignment.distanceMeters,
  amount: order.totalAmount,
  paymentMethod: order.paymentMethod,
  isCOD: /cash|cod/i.test(order.paymentMethod || ''),
  itemCount: (order.items || []).length,
  pickup: order.pickup || null,
  drop: order.deliveryLocation || null,
  deliveryAddress: order.deliveryAddress,
});

/** Create an offer for one partner. Does NOT touch the Order yet. */
export const createOffer = async ({ order, partnerUser, partner, attempt = 1, timeoutSec = 25, source = 'manual' }) => {
  const distanceMeters = geoDistanceMeters(order.pickup, {
    lat: partner.currentLocation?.coordinates?.[1],
    lng: partner.currentLocation?.coordinates?.[0],
  });
  const assignment = await Assignment.create({
    orderId: order.orderId,
    partnerUserId: partnerUser._id,
    partnerName: partnerUser.name,
    attempt,
    distanceMeters,
    expiresAt: new Date(Date.now() + timeoutSec * 1000),
    source,
  });

  emit('partner:' + String(partnerUser._id), 'delivery_offer', orderOfferPayload(order, assignment));
  await Notification.create({
    userId: String(partnerUser._id),
    title: 'New delivery offer',
    body: `Order ${order.orderId} — ₹${order.totalAmount}. Respond within ${timeoutSec}s.`,
    type: 'Offer',
  });
  // Push wakes the app when the socket isn't live (backgrounded / killed).
  sendToOwner(partnerUser._id, {
    title: 'New delivery offer',
    body: `Order ${order.orderId} — ₹${order.totalAmount}. Tap to respond.`,
    data: { type: 'delivery_offer', assignmentId: String(assignment._id), orderId: order.orderId },
  }).catch(() => {});
  return assignment;
};

/** Atomic accept. */
export const acceptOffer = async ({ assignmentId, user }) => {
  const a = await Assignment.findOneAndUpdate(
    { _id: assignmentId, partnerUserId: user._id, status: 'offered' },
    { $set: { status: 'accepted', respondedAt: new Date() } },
    { new: true }
  );
  if (!a) return { ok: false, code: 'offer_gone', message: 'This offer is no longer available.' };

  const order = await Order.findOneAndUpdate(
    { orderId: a.orderId, deliveryPartnerUserId: { $in: [null, undefined] } },
    {
      $set: {
        deliveryPartnerUserId: user._id,
        deliveryPartnerId: String(user._id),
        deliveryPartnerName: user.name,
        assignmentId: a._id,
        status: 'Assigned',
        assignmentStalled: false,
      },
      $push: { trackingTimeline: { status: 'Assigned', note: `Assigned to ${user.name}` } },
    },
    { new: true }
  );
  if (!order) {
    await Assignment.updateOne({ _id: a._id }, { $set: { status: 'cancelled', reason: 'order already assigned' } });
    return { ok: false, code: 'order_taken', message: 'Another partner already took this order.' };
  }

  // Attach the order to the partner's active queue.
  const partner = await DeliveryPartner.findOne({ userId: user._id });
  if (partner) {
    if (!(partner.activeOrderIds || []).includes(order.orderId)) partner.activeOrderIds.push(order.orderId);
    partner.availability = availabilityFor(partner);
    await partner.save();
  }

  const riderLoc = partner?.currentLocation?.coordinates
    ? { lat: partner.currentLocation.coordinates[1], lng: partner.currentLocation.coordinates[0] }
    : null;
  const firstName = String(user.name || 'Delivery partner').split(' ')[0];
  const at = new Date().toISOString();

  // --- Sync every client watching this order (customer web + mobile) NOW ---
  emit('partner:' + String(user._id), 'assignment_confirmed', { assignmentId: String(a._id), orderId: order.orderId });
  emit(order.orderId, 'order_status_update', {
    orderId: order.orderId, status: order.status, note: `Assigned to ${user.name}`,
    eta: order.estimatedDelivery, timeline: order.trackingTimeline, at,
  });
  // Rich rider card for the customer — no extra REST round-trip needed.
  emit(order.orderId, 'rider_assigned', {
    orderId: order.orderId,
    status: 'Assigned',
    delivery: {
      partnerName: firstName,
      vehicleType: partner?.vehicleType || null,
      rating: partner?.rating ?? null,
      revealed: false, // phone / contact opens at "Out For Delivery"
      location: riderLoc,
      locationUpdatedAt: partner?.locationUpdatedAt || null,
    },
    eta: order.estimatedDelivery,
    at,
  });
  // Seed the live marker immediately instead of waiting up to one heartbeat.
  if (riderLoc) {
    emit(order.orderId, 'rider_location_update', {
      orderId: order.orderId, lat: riderLoc.lat, lng: riderLoc.lng, riderName: firstName,
    });
  }

  // --- Non-blocking cleanup: revoke the losing offers + ping ops fleet. The
  // atomic Order update above is the real guard, so this need not block the
  // accepting partner's response. ---
  (async () => {
    try {
      if (partner) emit('admin_fleet', 'fleet_update', fleetPayload(partner, user.name));
      const others = await Assignment.find({ orderId: a.orderId, status: 'offered', _id: { $ne: a._id } });
      if (others.length) {
        await Assignment.updateMany(
          { _id: { $in: others.map((o) => o._id) } },
          { $set: { status: 'cancelled', reason: 'order assigned to another partner' } }
        );
        for (const o of others) {
          emit('partner:' + String(o.partnerUserId), 'delivery_offer_revoked', { assignmentId: String(o._id), orderId: a.orderId });
        }
      }
    } catch (_) { /* best-effort */ }
  })();

  return { ok: true, order, assignment: a };
};

/** Atomic reject → mark stalled for manual re-assignment (P1 turns this into re-offer). */
export const rejectOffer = async ({ assignmentId, user, reason }) => {
  const a = await Assignment.findOneAndUpdate(
    { _id: assignmentId, partnerUserId: user._id, status: 'offered' },
    { $set: { status: 'rejected', respondedAt: new Date(), reason: reason || 'declined' } },
    { new: true }
  );
  if (!a) return { ok: false, code: 'offer_gone' };
  await onOfferDeclined(a.orderId, `Partner ${user.name} declined`, { source: a.source });
  return { ok: true };
};

const markStalled = async (orderId, why) => {
  const order = await Order.findOneAndUpdate(
    { orderId, deliveryPartnerUserId: { $in: [null, undefined] } },
    { $set: { assignmentStalled: true } },
    { new: true }
  );
  if (!order) return; // already assigned elsewhere
  emit('admin_fleet', 'assignment_stalled', { orderId, reason: why });
  await notifyAdmins('Delivery needs assignment', `Order ${orderId}: ${why}. Assign a partner manually.`);
};

// A live offer was rejected / expired. For auto-dispatched orders, roll to the
// next-best candidate; otherwise flag it for the admin.
const onOfferDeclined = async (orderId, why, { source } = {}) => {
  const order = await Order.findOne({ orderId });
  if (!order || order.deliveryPartnerUserId) return; // already assigned elsewhere
  if (source === 'auto') {
    const r = await tryAssign(order).catch(() => ({ ok: false }));
    if (r.ok) return; // re-offered to the next partner
  }
  await markStalled(orderId, why);
};

/**
 * Rank online, in-radius, under-capacity partners for an order's pickup point.
 * Uses the 2dsphere `$near` index when the pickup has coords, else a plain scan.
 */
export const findCandidates = async ({ pickup, excludeUserIds = [], radiusKm = 6, restrictUserIds = null, drop = null, batchRadiusKm = 0 }) => {
  const base = { isOnline: true, userId: { $nin: excludeUserIds } };
  if (Array.isArray(restrictUserIds) && restrictUserIds.length) base.userId = { $nin: excludeUserIds, $in: restrictUserIds };
  const hasGeo = pickup && pickup.lat != null && pickup.lng != null;
  const query = hasGeo
    ? {
        ...base,
        currentLocation: {
          $near: {
            $geometry: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
            $maxDistance: radiusKm * 1000,
          },
        },
      }
    : base;

  let partners = (await DeliveryPartner.find(query).limit(CANDIDATE_LIMIT).lean())
    .filter((p) => (p.activeOrderIds || []).length < (p.maxConcurrent || 1));

  // Batching guard: a partner who is already carrying a delivery may only take a
  // second one when the new drop is close to a drop they already have — otherwise
  // a multi-drop sends them across the city. Partners with a free slot are unaffected.
  if (drop?.lat != null && drop?.lng != null && batchRadiusKm > 0) {
    const busyIds = partners.filter((p) => (p.activeOrderIds || []).length > 0).flatMap((p) => p.activeOrderIds);
    if (busyIds.length) {
      const activeOrders = await Order.find({ orderId: { $in: busyIds } }).select('orderId deliveryLocation').lean();
      const dropByOrder = Object.fromEntries(activeOrders.map((o) => [o.orderId, o.deliveryLocation]));
      partners = partners.filter((p) => {
        if (!(p.activeOrderIds || []).length) return true;
        return (p.activeOrderIds || []).some((oid) => {
          const d = dropByOrder[oid];
          if (d?.lat == null) return false;
          const m = geoDistanceMeters(drop, d);
          return m != null && m <= batchRadiusKm * 1000;
        });
      });
    }
  }
  if (!partners.length) return [];

  const users = await User.find({
    _id: { $in: partners.map((p) => p.userId) },
    role: 'Delivery',
    status: 'Active',
  }).select('name').lean();
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));

  return partners
    .filter((p) => byId[String(p.userId)])
    .map((p) => ({
      partner: p,
      user: byId[String(p.userId)],
      distance: geoDistanceMeters(pickup, {
        lat: p.currentLocation?.coordinates?.[1],
        lng: p.currentLocation?.coordinates?.[0],
      }),
      activeCount: (p.activeOrderIds || []).length,
      rating: p.rating || 0,
    }))
    .sort(
      (a, b) =>
        (a.distance ?? 1e12) - (b.distance ?? 1e12) ||
        a.activeCount - b.activeCount ||
        b.rating - a.rating
    );
};

/**
 * Try to auto-dispatch one order. Finds the nearest non-empty ring of online,
 * in-radius, under-capacity partners (radius grows from 100m outward) and
 * broadcasts the offer to every partner in that ring at once. The first to
 * accept wins; all other offers for the order are revoked. Called when an order
 * becomes Ready and again once a whole batch has declined/expired (wider batch).
 * Idempotent — bails if the order already has a partner or any live offer.
 */
export const tryAssign = async (orderOrId) => {
  const order = typeof orderOrId === 'string' ? await Order.findOne({ orderId: orderOrId }) : orderOrId;
  if (!order) return { ok: false, code: 'no_order' };
  if (order.deliveryPartnerUserId) return { ok: false, code: 'already_assigned' };
  if (order.status !== 'Ready') return { ok: false, code: 'not_ready' };
  if (await Assignment.findOne({ orderId: order.orderId, status: 'offered' })) {
    return { ok: false, code: 'offer_pending' };
  }

  const s = (await Settings.findOne()) || {};
  const timeoutSec = s.offerTimeoutSec || 25;
  const maxAttempts = s.maxOfferAttempts || 5;
  const baseRadius = s.assignRadiusKm || 6;
  const batchRadiusKm = s.batchRadiusKm ?? 1.5;

  const prior = await Assignment.find({ orderId: order.orderId }).select('partnerUserId attempt').lean();
  const excludeUserIds = [...new Set(prior.map((a) => String(a.partnerUserId)))];
  const attempt = prior.reduce((m, a) => Math.max(m, a.attempt || 1), 0) + 1;
  if (attempt > maxAttempts) {
    await markStalled(order.orderId, `no partner accepted after ${maxAttempts} attempts`);
    return { ok: false, code: 'exhausted' };
  }

  // Zone scoping (P2-D5): if the pickup falls inside an active zone and partners
  // are tagged for it, prefer them. Never strand an order — fall back to the
  // unrestricted radius search if the zoned search comes up empty.
  let restrictUserIds = null;
  if (order.pickup?.lat != null && order.pickup?.lng != null) {
    try {
      const zone = await DeliveryZone.findOne({
        active: true,
        polygon: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [order.pickup.lng, order.pickup.lat] } } },
      }).select('_id').lean();
      if (zone) {
        const tagged = await DeliveryPartner.find({ zones: String(zone._id) }).select('userId').lean();
        if (tagged.length) restrictUserIds = tagged.map((p) => String(p.userId));
      }
    } catch (_) { /* zone lookup is best-effort */ }
  }

  // Broadcast dispatch: cover the whole configured radius, growing outward on
  // each re-offer batch. Attempt 1 = base radius (default 6 km); each later
  // batch (after a whole batch declined/expired) widens by one base radius, up
  // to 3×. `findCandidates` returns nearest-first, so the closest riders still
  // rank first even though everyone in range is offered at once.
  const radiusKm = baseRadius * Math.min(attempt, 3);
  let candidates = [];
  // Pass 1: zone-restricted (skipped when no zone applies). Pass 2: unrestricted.
  const passes = restrictUserIds ? [restrictUserIds, null] : [null];
  for (const list of passes) {
    candidates = await findCandidates({
      pickup: order.pickup, excludeUserIds, radiusKm, restrictUserIds: list,
      drop: order.deliveryLocation, batchRadiusKm,
    });
    if (candidates.length) break;
  }
  if (!candidates.length) {
    await markStalled(order.orderId, 'no available partner nearby');
    return { ok: false, code: 'no_candidate' };
  }

  // Offer to every eligible partner in range at once (not one-by-one).
  // acceptOffer is atomic: the first partner to accept wins the order and every
  // other live offer for it is revoked immediately, so it disappears from the
  // other partners' apps. A partial set of declines does not re-broadcast — the
  // next (wider) batch is only tried once all of this batch's offers are gone
  // (see `onOfferDeclined` / `expireStaleOffers`).
  const maxFanout = Math.max(1, s.maxFanout || CANDIDATE_LIMIT);
  const targets = candidates.slice(0, maxFanout);
  const created = [];
  for (const c of targets) {
    const partnerDoc = await DeliveryPartner.findOne({ userId: c.user._id });
    const a = await createOffer({
      order, partnerUser: c.user, partner: partnerDoc, attempt, timeoutSec, source: 'auto',
    }).catch(() => null);
    if (a) created.push({ assignmentId: String(a._id), partnerUserId: String(c.user._id), distanceMeters: c.distance });
  }
  if (!created.length) {
    await markStalled(order.orderId, 'could not create offers');
    return { ok: false, code: 'offer_failed' };
  }
  await Order.updateOne({ orderId: order.orderId }, { $set: { assignmentStalled: false } });
  emit('admin_fleet', 'auto_offer', {
    orderId: order.orderId, attempt, count: created.length,
    partnerUserId: created[0].partnerUserId, // back-compat (nearest)
    partnerUserIds: created.map((c) => c.partnerUserId),
    distanceMeters: created[0].distanceMeters,
  });
  return {
    ok: true,
    offers: created,
    count: created.length,
    attempt,
    // back-compat: the nearest candidate (offers are now sent to all at once)
    assignmentId: created[0].assignmentId,
    partnerUserId: created[0].partnerUserId,
  };
};

/** Sweeper body — call on an interval from index.js. */
export const expireStaleOffers = async () => {
  const stale = await Assignment.find({ status: 'offered', expiresAt: { $lt: new Date() } });
  for (const a of stale) {
    await Assignment.updateOne({ _id: a._id }, { $set: { status: 'expired', respondedAt: new Date() } });
    emit('partner:' + String(a.partnerUserId), 'delivery_offer_revoked', { assignmentId: String(a._id), orderId: a.orderId, reason: 'expired' });
    await onOfferDeclined(a.orderId, 'offer expired', { source: a.source });
  }
  return stale.length;
};

/** Order cancelled / removed — clean up any live assignment + free the partner. */
export const cancelForOrder = async (orderId, reason = 'order cancelled') => {
  const live = await Assignment.find({ orderId, status: { $in: ['offered', 'accepted'] } });
  if (!live.length) return;
  await Assignment.updateMany({ _id: { $in: live.map((a) => a._id) } }, { $set: { status: 'cancelled', reason } });
  for (const a of live) {
    emit('partner:' + String(a.partnerUserId), 'order_cancelled', { orderId, reason });
    await Notification.create({
      userId: String(a.partnerUserId),
      title: 'Delivery cancelled',
      body: `Order ${orderId} was cancelled${reason ? ` (${reason})` : ''}.`,
      type: 'Order',
    }).catch(() => {});
    if (a.status === 'accepted') {
      const partner = await DeliveryPartner.findOne({ userId: a.partnerUserId });
      if (partner) {
        partner.activeOrderIds = (partner.activeOrderIds || []).filter((id) => id !== orderId);
        partner.availability = availabilityFor(partner);
        await partner.save();
        const u = await User.findById(a.partnerUserId).select('name');
        emit('admin_fleet', 'fleet_update', fleetPayload(partner, u?.name));
      }
    }
  }
};

// Releases the assigned partner when an order is force-finished from the
// admin console (status set to Delivered/Failed/Returned directly) instead
// of via the partner app's own completion flow — that flow already frees the
// partner itself (deliveryController's freePartnerFromOrder), but an admin
// override otherwise leaves the order stuck in the partner's activeOrderIds
// forever, blocking them from ever going offline again.
export const completeForOrder = async (orderId, status) => {
  const live = await Assignment.findOne({ orderId, status: 'accepted' });
  if (!live) return;
  await Assignment.updateOne(
    { _id: live._id },
    { $set: { status: status === 'Delivered' ? 'completed' : 'failed', respondedAt: new Date() } }
  );
  const partner = await DeliveryPartner.findOne({ userId: live.partnerUserId });
  if (!partner) return;
  partner.activeOrderIds = (partner.activeOrderIds || []).filter((id) => id !== orderId);
  partner.availability = availabilityFor(partner);
  if (status === 'Delivered') partner.completedCount = (partner.completedCount || 0) + 1;
  else partner.failedCount = (partner.failedCount || 0) + 1;
  await partner.save();
  const u = await User.findById(live.partnerUserId).select('name');
  emit('admin_fleet', 'fleet_update', fleetPayload(partner, u?.name));
};

export const assignmentService = {
  setIo, geoDistanceMeters, createOffer, acceptOffer, rejectOffer, expireStaleOffers, cancelForOrder,
  completeForOrder, findCandidates, tryAssign,
};
