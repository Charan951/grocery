import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { Order } from '../models/Order.js';
import { Assignment } from '../models/Assignment.js';
import { Settings, Notification } from '../models/Operations.js';
import { DeliveryEarning } from '../models/DeliveryEarning.js';
import { DeliveryZone } from '../models/DeliveryZone.js';
import { createOffer, acceptOffer, cancelForOrder, tryAssign } from '../services/assignmentService.js';
import { logAudit } from './apiController.js';
import { sendDeliveryCredentials } from '../services/mailService.js';

const TERMINAL = ['Delivered', 'Cancelled', 'Returned', 'Refunded'];

// Accept a flat ring of points ([[lng,lat],...] or [{lat,lng},...]), validate,
// and return a closed GeoJSON linear ring. { ring } | { error }.
const normaliseRing = (input) => {
  if (!Array.isArray(input) || input.length < 3) {
    return { error: 'A zone needs at least 3 boundary points' };
  }
  const pts = input.map((p) => {
    if (Array.isArray(p) && p.length === 2) return [Number(p[0]), Number(p[1])];
    if (p && typeof p === 'object') return [Number(p.lng), Number(p.lat)];
    return [NaN, NaN];
  });
  for (const [lng, lat] of pts) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return { error: 'Invalid coordinate in the zone boundary' };
    }
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  const ring = (first[0] === last[0] && first[1] === last[1]) ? pts : [...pts, first];
  return { ring };
};

const partnerRow = (p, u) => ({
  userId: String(p.userId),
  name: u?.name || '',
  email: u?.email || '',
  phone: p.phone || u?.phone || '',
  vehicleType: p.vehicleType,
  accountStatus: u?.status || 'Active',
  isOnline: p.isOnline,
  availability: p.availability,
  activeOrderIds: p.activeOrderIds || [],
  maxConcurrent: p.maxConcurrent,
  zones: p.zones || [],
  rating: p.rating,
  ratingCount: p.ratingCount || 0,
  completedCount: p.completedCount,
  failedCount: p.failedCount,
  location: p.currentLocation?.coordinates
    ? { lng: p.currentLocation.coordinates[0], lat: p.currentLocation.coordinates[1] }
    : null,
  locationUpdatedAt: p.locationUpdatedAt,
  lastSeenAt: p.lastSeenAt,
});

export const adminDeliveryController = {
  // GET /api/admin/delivery/partners
  listPartners: async (req, res) => {
    try {
      const partners = await DeliveryPartner.find().lean();
      const users = await User.find({ _id: { $in: partners.map((p) => p.userId) } })
        .select('name email phone status').lean();
      const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
      res.json({ success: true, partners: partners.map((p) => partnerRow(p, byId[String(p.userId)])) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/admin/delivery/fleet — online partners for the live map
  fleet: async (req, res) => {
    try {
      const partners = await DeliveryPartner.find({ isOnline: true }).lean();
      const users = await User.find({ _id: { $in: partners.map((p) => p.userId) } })
        .select('name phone').lean();
      const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
      res.json({ success: true, fleet: partners.map((p) => partnerRow(p, byId[String(p.userId)])) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/admin/orders/:id/assign  { partnerUserId, force? }
  assignOrder: async (req, res) => {
    try {
      const { partnerUserId, force } = req.body;
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (TERMINAL.includes(order.status)) {
        return res.status(409).json({ success: false, message: `Order is ${order.status}` });
      }
      if (order.deliveryPartnerUserId) {
        return res.status(409).json({ success: false, message: 'Order already has a partner — use reassign' });
      }

      const partnerUser = await User.findOne({ _id: partnerUserId, role: 'Delivery', status: 'Active' });
      if (!partnerUser) return res.status(400).json({ success: false, message: 'Invalid / inactive delivery partner' });
      const partner = await DeliveryPartner.findOne({ userId: partnerUser._id })
        || await DeliveryPartner.create({ userId: partnerUser._id, phone: partnerUser.phone });

      const settings = (await Settings.findOne()) || {};

      if (force === true || force === 'true') {
        // Direct assign — create an already-accepted assignment and apply its effects.
        const a = await Assignment.create({
          orderId: order.orderId, partnerUserId: partnerUser._id, partnerName: partnerUser.name,
          status: 'accepted', respondedAt: new Date(), source: 'manual_force',
        });
        order.deliveryPartnerUserId = partnerUser._id;
        order.deliveryPartnerId = String(partnerUser._id);
        order.deliveryPartnerName = partnerUser.name;
        order.assignmentId = a._id;
        order.assignmentStalled = false;
        if (order.status === 'Ready' || order.status === 'Pending') order.status = 'Assigned';
        order.trackingTimeline.push({ status: 'Assigned', note: `Force-assigned to ${partnerUser.name} by ${req.user.name}` });
        await order.save();
        if (!(partner.activeOrderIds || []).includes(order.orderId)) partner.activeOrderIds.push(order.orderId);
        partner.availability = !partner.isOnline ? 'offline'
          : (partner.activeOrderIds.length >= (partner.maxConcurrent || 1) ? 'busy' : 'available');
        await partner.save();
        req.app.get('io')?.to(order.orderId).emit('order_status_update', {
          orderId: order.orderId, status: order.status, note: 'Assigned', timeline: order.trackingTimeline, at: new Date().toISOString(),
        });
        req.app.get('io')?.to('partner:' + String(partnerUser._id)).emit('assignment_confirmed', {
          assignmentId: String(a._id), orderId: order.orderId, forced: true,
        });
        await logAudit(String(req.user._id), req.user.name, 'Order Force-Assigned', `${order.orderId} → ${partnerUser.name}`);
        return res.json({ success: true, mode: 'forced', order });
      }

      // Offer flow — partner must accept.
      await Order.updateOne({ orderId: order.orderId }, { $set: { assignmentStalled: false } });
      const assignment = await createOffer({
        order, partnerUser, partner, attempt: 1, timeoutSec: settings.offerTimeoutSec || 25, source: 'manual',
      });
      await logAudit(String(req.user._id), req.user.name, 'Order Offered', `${order.orderId} → ${partnerUser.name}`);
      res.json({ success: true, mode: 'offered', assignmentId: assignment._id, expiresAt: assignment.expiresAt });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/admin/orders/:id/reassign  { partnerUserId, force? }
  reassignOrder: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (TERMINAL.includes(order.status)) return res.status(409).json({ success: false, message: `Order is ${order.status}` });

      const prevPartner = order.deliveryPartnerName;
      await cancelForOrder(order.orderId, `reassigned by ${req.user.name}`);
      await Order.updateOne({ orderId: order.orderId }, {
        $set: { deliveryPartnerUserId: undefined, deliveryPartnerId: undefined, deliveryPartnerName: undefined, assignmentId: undefined },
      });
      await logAudit(String(req.user._id), req.user.name, 'Order Reassign (unassigned prev)', `${order.orderId} was ${prevPartner || 'unassigned'}`);

      // Delegate to assign with the same body.
      req.params.id = order.orderId;
      return adminDeliveryController.assignOrder(req, res);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/admin/orders/:id/unassign  { reason }
  unassignOrder: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      await cancelForOrder(order.orderId, req.body.reason || `unassigned by ${req.user.name}`);
      order.deliveryPartnerUserId = undefined;
      order.deliveryPartnerId = undefined;
      order.deliveryPartnerName = undefined;
      order.assignmentId = undefined;
      order.assignmentStalled = false;
      if (!TERMINAL.includes(order.status)) order.status = 'Ready';
      order.trackingTimeline.push({ status: 'Ready', note: `Unassigned by ${req.user.name}${req.body.reason ? ': ' + req.body.reason : ''}` });
      await order.save();

      req.app.get('io')?.to(order.orderId).emit('order_status_update', {
        orderId: order.orderId, status: order.status, note: 'Unassigned', timeline: order.trackingTimeline, at: new Date().toISOString(),
      });
      await logAudit(String(req.user._id), req.user.name, 'Order Unassigned', `${order.orderId}: ${req.body.reason || '-'}`);
      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/admin/delivery/partners/:userId/reset-password  { password }
  // Goes through user.save() so the model's pre-save bcrypt hook runs.
  resetPartnerPassword: async (req, res) => {
    try {
      const password = String(req.body.password || '');
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const user = await User.findOne({ _id: req.params.userId, role: 'Delivery' });
      if (!user) return res.status(404).json({ success: false, message: 'Delivery partner not found' });
      user.password = password;
      await user.save();
      await logAudit(String(req.user._id), req.user.name, 'Partner Password Reset', `${user.name} (${user.email})`);

      if (user.email) {
        sendDeliveryCredentials({
          to: user.email,
          name: user.name,
          email: user.email,
          password,
          mode: 'reset',
        }).catch((e) => console.error('[mail] resetPartnerPassword:', e?.message || e));
      }

      res.json({ success: true, message: 'Password reset' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/admin/delivery/partners/:userId/deliveries?status=&limit=
  partnerDeliveries: async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const q = { deliveryPartnerUserId: userId };
      if (req.query.status) q.status = req.query.status;
      const orders = await Order.find(q)
        .select('orderId status totalAmount paymentMethod paymentStatus deliveryAddress createdAt pickedUpAt deliveredAt failureReason assignmentStalled')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      res.json({ success: true, deliveries: orders });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/admin/delivery/partners/:userId/performance
  partnerPerformance: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findOne({ _id: userId, role: 'Delivery' }).select('name email phone status').lean();
      if (!user) return res.status(404).json({ success: false, message: 'Delivery partner not found' });
      const partner = await DeliveryPartner.findOne({ userId }).lean();

      const assignments = await Assignment.find({ partnerUserId: userId }).select('status attempt source createdAt respondedAt').lean();
      const count = (s) => assignments.filter((a) => a.status === s).length;
      const offered = assignments.length;
      const accepted = count('accepted') + count('completed'); // completed implies it was accepted
      const rejected = count('rejected');
      const expired = count('expired');
      const responded = accepted + rejected;
      const acceptanceRate = responded ? Math.round((accepted / responded) * 100) : null;

      const orders = await Order.find({ deliveryPartnerUserId: userId })
        .select('status pickedUpAt deliveredAt createdAt').lean();
      const delivered = orders.filter((o) => o.status === 'Delivered');
      const failed = orders.filter((o) => o.status === 'Failed');
      const mins = (a, b) => (a && b ? (new Date(b) - new Date(a)) / 60000 : null);
      const avg = (arr) => (arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null);
      const deliveryLegs = delivered.map((o) => mins(o.pickedUpAt, o.deliveredAt)).filter((n) => n != null && n >= 0);
      const pickupLegs = delivered.map((o) => mins(o.createdAt, o.pickedUpAt)).filter((n) => n != null && n >= 0);

      res.json({
        success: true,
        partner: {
          userId, name: user.name, email: user.email, phone: user.phone || partner?.phone || '',
          accountStatus: user.status, isOnline: !!partner?.isOnline, availability: partner?.availability || 'offline',
          vehicleType: partner?.vehicleType || 'bike', rating: partner?.rating ?? 5, ratingCount: partner?.ratingCount ?? 0,
          activeOrderIds: partner?.activeOrderIds || [], maxConcurrent: partner?.maxConcurrent || 1,
          zones: partner?.zones || [],
          distanceKm: Math.round(((partner?.distanceTravelledM || 0) / 1000) * 10) / 10,
        },
        performance: {
          lifetimeCompleted: partner?.completedCount ?? 0,
          lifetimeFailed: partner?.failedCount ?? 0,
          offered, accepted, rejected, expired, acceptanceRate,
          deliveredCount: delivered.length,
          failedCount: failed.length,
          avgPickupMins: avg(pickupLegs),
          avgDeliveryMins: avg(deliveryLegs),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/admin/delivery/partners/:userId/earnings?status=pending|settled&limit=
  partnerEarnings: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findOne({ _id: userId, role: 'Delivery' }).select('name').lean();
      if (!user) return res.status(404).json({ success: false, message: 'Delivery partner not found' });

      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const q = { partnerUserId: userId };
      if (req.query.status === 'pending' || req.query.status === 'settled') q.status = req.query.status;

      const items = await DeliveryEarning.find(q).sort({ earnedAt: -1 }).limit(limit).lean();
      const all = await DeliveryEarning.find({ partnerUserId: userId }).select('total status').lean();
      const sum = (arr) => arr.reduce((s, e) => s + (e.total || 0), 0);

      res.json({
        success: true,
        partner: { userId, name: user.name },
        summary: {
          lifetimeTotal: sum(all),
          pendingTotal: sum(all.filter((e) => e.status === 'pending')),
          settledTotal: sum(all.filter((e) => e.status === 'settled')),
          count: all.length,
        },
        earnings: items,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/admin/delivery/partners/:userId/earnings/settle  { ids?: string[] }  (omit = all pending)
  settlePartnerEarnings: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findOne({ _id: userId, role: 'Delivery' }).select('name').lean();
      if (!user) return res.status(404).json({ success: false, message: 'Delivery partner not found' });

      const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
      const filter = { partnerUserId: userId, status: 'pending', ...(ids ? { _id: { $in: ids } } : {}) };
      const r = await DeliveryEarning.updateMany(filter, { $set: { status: 'settled', settledAt: new Date() } });
      const settled = r.modifiedCount ?? r.nModified ?? 0;

      await logAudit(String(req.user._id), req.user.name, 'Delivery Earnings Settled',
        `${user.name}: ${settled} payout(s)${ids ? ' (selected)' : ' (all pending)'}`);

      res.json({ success: true, settled });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // --- Delivery zones (P2-D5) ---

  // GET /api/admin/delivery/zones
  listZones: async (req, res) => {
    try {
      const zones = await DeliveryZone.find().sort({ createdAt: -1 }).lean();
      res.json({ success: true, zones });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/admin/delivery/zones  { name, coordinates:[[lng,lat],...], slaMinutes? }
  createZone: async (req, res) => {
    try {
      const { name, coordinates, slaMinutes } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Zone name is required' });
      const ring = normaliseRing(coordinates);
      if (ring.error) return res.status(400).json({ success: false, message: ring.error });

      const zone = await DeliveryZone.create({
        name: String(name).trim(),
        polygon: { type: 'Polygon', coordinates: [ring.ring] },
        slaMinutes: Number(slaMinutes) > 0 ? Number(slaMinutes) : 15,
        active: true,
      });
      await logAudit(String(req.user._id), req.user.name, 'Delivery Zone Created', zone.name);
      res.json({ success: true, zone });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // PUT /api/admin/delivery/zones/:id  { name?, coordinates?, slaMinutes?, active? }
  updateZone: async (req, res) => {
    try {
      const zone = await DeliveryZone.findById(req.params.id);
      if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
      const { name, coordinates, slaMinutes, active } = req.body || {};
      if (name != null) zone.name = String(name).trim() || zone.name;
      if (slaMinutes != null && Number(slaMinutes) > 0) zone.slaMinutes = Number(slaMinutes);
      if (active != null) zone.active = active === true || active === 'true';
      if (coordinates != null) {
        const ring = normaliseRing(coordinates);
        if (ring.error) return res.status(400).json({ success: false, message: ring.error });
        zone.polygon = { type: 'Polygon', coordinates: [ring.ring] };
      }
      await zone.save();
      await logAudit(String(req.user._id), req.user.name, 'Delivery Zone Updated', zone.name);
      res.json({ success: true, zone });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/admin/delivery/zones/:id
  deleteZone: async (req, res) => {
    try {
      const zone = await DeliveryZone.findByIdAndDelete(req.params.id);
      if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
      await DeliveryPartner.updateMany({ zones: String(zone._id) }, { $pull: { zones: String(zone._id) } });
      await logAudit(String(req.user._id), req.user.name, 'Delivery Zone Deleted', zone.name);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // PUT /api/admin/delivery/partners/:userId  { vehicleType?, maxConcurrent?, zones? }
  updatePartner: async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.params.userId, role: 'Delivery' }).select('name').lean();
      if (!user) return res.status(404).json({ success: false, message: 'Delivery partner not found' });
      const partner = await DeliveryPartner.findOne({ userId: req.params.userId })
        || await DeliveryPartner.create({ userId: req.params.userId });

      const { vehicleType, maxConcurrent, zones } = req.body || {};
      if (vehicleType && ['bike', 'scooter', 'bicycle', 'car', 'on_foot'].includes(vehicleType)) {
        partner.vehicleType = vehicleType;
      }
      if (maxConcurrent != null) {
        partner.maxConcurrent = Math.min(Math.max(parseInt(maxConcurrent, 10) || 1, 1), 5);
      }
      if (Array.isArray(zones)) {
        const valid = await DeliveryZone.find({ _id: { $in: zones } }).select('_id').lean();
        partner.zones = valid.map((z) => String(z._id));
      }
      await partner.save();
      await logAudit(String(req.user._id), req.user.name, 'Delivery Partner Updated', user.name);
      res.json({ success: true, partner: { userId: req.params.userId, vehicleType: partner.vehicleType, maxConcurrent: partner.maxConcurrent, zones: partner.zones } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/admin/delivery/returns  — orders awaiting return + recently returned
  listReturns: async (req, res) => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const orders = await Order.find({
        $or: [
          { needsReturn: true },
          { status: 'Returned', returnedAt: { $gte: sevenDaysAgo } },
        ],
      })
        .select('orderId status failureReason needsReturn returnedAt deliveryPartnerName deliveryPartnerUserId totalAmount paymentMethod paymentStatus updatedAt')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean();
      res.json({
        success: true,
        awaiting: orders.filter((o) => o.needsReturn).length,
        orders,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/admin/orders/:id/requeue  { reason? }
  // Put a Failed (pre-pickup) or Returned order back into the assignment queue.
  requeueOrder: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (!['Failed', 'Returned'].includes(order.status)) {
        return res.status(409).json({ success: false, message: `Only a Failed or Returned order can be requeued (this is ${order.status})` });
      }
      if (order.needsReturn) {
        return res.status(409).json({ success: false, message: 'Parcel is still out with the partner — wait for the return first' });
      }

      const reason = String(req.body.reason || '').trim() || 'Requeued for another attempt';
      order.status = 'Ready';
      order.failureReason = undefined;
      order.assignmentStalled = false;
      order.deliveryPartnerUserId = undefined;
      order.deliveryPartnerId = undefined;
      order.deliveryPartnerName = undefined;
      order.assignmentId = undefined;
      order.pickedUpAt = undefined;
      order.deliveredAt = undefined;
      order.returnedAt = undefined;
      order.trackingTimeline.push({ status: 'Ready', note: `${reason} (by ${req.user.name})` });
      await order.save();

      await logAudit(String(req.user._id), req.user.name, 'Order Requeued', `${order.orderId}: ${reason}`);
      req.app.get('io')?.to(order.orderId).emit('order_status_update', {
        orderId: order.orderId, status: 'Ready', note: reason, timeline: order.trackingTimeline, at: new Date().toISOString(),
      });
      if (order.customerId) {
        await Notification.create({
          userId: order.customerId, type: 'Order',
          title: 'Your order is being re-attempted',
          body: `Order ${order.orderId} is back in the queue for delivery.`,
        }).catch(() => {});
      }

      // Kick auto-assignment (non-blocking, same as the Ready trigger).
      tryAssign(order.orderId).catch(() => {});

      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/admin/delivery/analytics?days=7  — fleet-wide rollup + leaderboard
  fleetAnalytics: async (req, res) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
      const since = new Date(Date.now() - days * 86400000);

      const partners = await DeliveryPartner.find().lean();
      const users = await User.find({ _id: { $in: partners.map((p) => p.userId) } })
        .select('name status').lean();
      const nameById = Object.fromEntries(users.map((u) => [String(u._id), u.name]));

      const [assignments, orders] = await Promise.all([
        Assignment.find({ createdAt: { $gte: since } }).select('partnerUserId status').lean(),
        Order.find({ deliveredAt: { $gte: since }, status: 'Delivered' })
          .select('deliveryPartnerUserId pickedUpAt deliveredAt createdAt deliveryRating').lean(),
      ]);

      const mins = (a, b) => (a && b ? (new Date(b) - new Date(a)) / 60000 : null);
      const acc = (arr) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null);
      const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

      const responded = assignments.filter((a) => ['accepted', 'completed', 'rejected'].includes(a.status));
      const acceptedTotal = assignments.filter((a) => ['accepted', 'completed'].includes(a.status)).length;
      const deliveryLegs = orders.map((o) => mins(o.pickedUpAt, o.deliveredAt)).filter((n) => n != null && n >= 0);
      const ratings = orders.map((o) => o.deliveryRating?.stars).filter((n) => n >= 1);

      // Per-partner leaderboard rows.
      const rows = partners.map((p) => {
        const uid = String(p.userId);
        const mine = assignments.filter((a) => String(a.partnerUserId) === uid);
        const myResponded = mine.filter((a) => ['accepted', 'completed', 'rejected'].includes(a.status));
        const myAccepted = mine.filter((a) => ['accepted', 'completed'].includes(a.status)).length;
        const myOrders = orders.filter((o) => String(o.deliveryPartnerUserId) === uid);
        const myLegs = myOrders.map((o) => mins(o.pickedUpAt, o.deliveredAt)).filter((n) => n != null && n >= 0);
        return {
          userId: uid,
          name: nameById[uid] || '—',
          isOnline: !!p.isOnline,
          delivered: myOrders.length,
          acceptanceRate: myResponded.length ? Math.round((myAccepted / myResponded.length) * 100) : null,
          avgDeliveryMins: round1(acc(myLegs)),
          rating: p.rating ?? 5,
          ratingCount: p.ratingCount || 0,
          distanceKm: round1((p.distanceTravelledM || 0) / 1000),
        };
      }).sort((a, b) => b.delivered - a.delivered);

      res.json({
        success: true,
        rangeDays: days,
        fleet: {
          totalPartners: partners.length,
          onlineNow: partners.filter((p) => p.isOnline).length,
          busyNow: partners.filter((p) => p.availability === 'busy').length,
          delivered: orders.length,
          acceptanceRate: responded.length ? Math.round((acceptedTotal / responded.length) * 100) : null,
          avgDeliveryMins: round1(acc(deliveryLegs)),
          avgRating: ratings.length ? Math.round((acc(ratings)) * 100) / 100 : null,
          ratedDeliveries: ratings.length,
        },
        leaderboard: rows,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/admin/delivery/partners/:userId/account  { active: boolean }
  setPartnerAccount: async (req, res) => {
    try {
      const active = req.body.active === true || req.body.active === 'true';
      const user = await User.findOne({ _id: req.params.userId, role: 'Delivery' });
      if (!user) return res.status(404).json({ success: false, message: 'Delivery partner not found' });
      const partner = await DeliveryPartner.findOne({ userId: user._id });

      if (!active && partner && (partner.activeOrderIds || []).length > 0) {
        return res.status(409).json({ success: false, message: 'Partner has active deliveries — reassign them first' });
      }

      user.status = active ? 'Active' : 'Suspended';
      await user.save();

      if (!active && partner) {
        partner.isOnline = false;
        partner.availability = 'offline';
        await partner.save();
        req.app.get('io')?.to('admin_fleet').emit('fleet_update', {
          userId: String(user._id), name: user.name, isOnline: false, availability: 'offline',
        });
      }

      await logAudit(String(req.user._id), req.user.name,
        active ? 'Partner Activated' : 'Partner Deactivated', `${user.name} (${user.email})`);
      res.json({ success: true, accountStatus: user.status });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};

// re-export for the partner-side accept/reject (used by deliveryController)
export { acceptOffer, cancelForOrder };
