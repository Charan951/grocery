import { Assignment } from '../models/Assignment.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { Notification } from '../models/Operations.js';

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
    type: 'Order',
  });
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

  // Free the partner's queue + availability.
  const partner = await DeliveryPartner.findOne({ userId: user._id });
  if (partner) {
    if (!(partner.activeOrderIds || []).includes(order.orderId)) partner.activeOrderIds.push(order.orderId);
    partner.availability = availabilityFor(partner);
    await partner.save();
    emit('admin_fleet', 'fleet_update', fleetPayload(partner, user.name));
  }

  // Revoke any other live offer for this order.
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

  emit('partner:' + String(user._id), 'assignment_confirmed', { assignmentId: String(a._id), orderId: order.orderId });
  emit(order.orderId, 'order_status_update', {
    orderId: order.orderId, status: order.status, note: `Assigned to ${user.name}`,
    eta: order.estimatedDelivery, timeline: order.trackingTimeline, at: new Date().toISOString(),
  });
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
  await onOfferDeclined(a.orderId, `Partner ${user.name} declined`);
  return { ok: true };
};

const onOfferDeclined = async (orderId, why) => {
  const order = await Order.findOneAndUpdate(
    { orderId, deliveryPartnerUserId: { $in: [null, undefined] } },
    { $set: { assignmentStalled: true } },
    { new: true }
  );
  if (!order) return; // already assigned elsewhere
  emit('admin_fleet', 'assignment_stalled', { orderId, reason: why });
  await notifyAdmins('Delivery needs assignment', `Order ${orderId}: ${why}. Assign a partner manually.`);
};

/** Sweeper body — call on an interval from index.js. */
export const expireStaleOffers = async () => {
  const stale = await Assignment.find({ status: 'offered', expiresAt: { $lt: new Date() } });
  for (const a of stale) {
    await Assignment.updateOne({ _id: a._id }, { $set: { status: 'expired', respondedAt: new Date() } });
    emit('partner:' + String(a.partnerUserId), 'delivery_offer_revoked', { assignmentId: String(a._id), orderId: a.orderId, reason: 'expired' });
    await onOfferDeclined(a.orderId, 'offer expired');
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

export const assignmentService = {
  setIo, geoDistanceMeters, createOffer, acceptOffer, rejectOffer, expireStaleOffers, cancelForOrder,
};
