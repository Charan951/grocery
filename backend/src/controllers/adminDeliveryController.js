import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { Order } from '../models/Order.js';
import { Assignment } from '../models/Assignment.js';
import { Settings } from '../models/Operations.js';
import { createOffer, acceptOffer, cancelForOrder } from '../services/assignmentService.js';
import { logAudit } from './apiController.js';
import { sendDeliveryCredentials } from '../services/mailService.js';

const TERMINAL = ['Delivered', 'Cancelled', 'Returned', 'Refunded'];

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
  rating: p.rating,
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
