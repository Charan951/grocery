import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { Order } from '../models/Order.js';
import { Assignment } from '../models/Assignment.js';
import { Notification } from '../models/Operations.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { acceptOffer, rejectOffer } from '../services/assignmentService.js';
import { registerDeviceToken, removeDeviceToken } from '../services/pushService.js';

const RESET_TTL_MS = 15 * 60 * 1000;
// No mailer wired yet — surface the reset code in the response so ops/support can
// relay it, exactly like the OTP dev flow.
const RESET_TEST_MODE = () => process.env.OTP_TEST_MODE === 'true' || !process.env.SMTP_HOST;

const clampLat = (v) => typeof v === 'number' && v >= -90 && v <= 90;
const clampLng = (v) => typeof v === 'number' && v >= -180 && v <= 180;

const availabilityFor = (partner) => {
  if (!partner.isOnline) return 'offline';
  return (partner.activeOrderIds || []).length >= (partner.maxConcurrent || 1) ? 'busy' : 'available';
};

const fleetPayload = (partner, user) => ({
  userId: String(partner.userId),
  name: user?.name,
  phone: partner.phone,
  vehicleType: partner.vehicleType,
  isOnline: partner.isOnline,
  availability: partner.availability,
  activeOrderIds: partner.activeOrderIds || [],
  location: partner.currentLocation?.coordinates
    ? { lng: partner.currentLocation.coordinates[0], lat: partner.currentLocation.coordinates[1] }
    : null,
  locationUpdatedAt: partner.locationUpdatedAt,
  rating: partner.rating,
});

// --- Delivery lifecycle helpers ---

const loadMyOrder = async (req) => {
  const order = await Order.findOne({ orderId: req.params.id });
  if (!order) return { err: [404, 'Order not found'] };
  if (String(order.deliveryPartnerUserId || '') !== String(req.user._id)) {
    return { err: [403, 'This order is not assigned to you'] };
  }
  return { order };
};

const emitOrder = (req, order, note) => {
  req.app.get('io')?.to(order.orderId).emit('order_status_update', {
    orderId: order.orderId, status: order.status, note,
    eta: order.estimatedDelivery, timeline: order.trackingTimeline, at: new Date().toISOString(),
  });
};

const notifyCustomer = async (order, title, body) => {
  try { await Notification.create({ userId: order.customerId, title, body, type: 'Order' }); } catch (_) {}
};

const freePartnerFromOrder = async (userId, orderId) => {
  const p = await DeliveryPartner.findOne({ userId });
  if (!p) return;
  p.activeOrderIds = (p.activeOrderIds || []).filter((id) => id !== orderId);
  p.availability = !p.isOnline ? 'offline'
    : (p.activeOrderIds.length >= (p.maxConcurrent || 1) ? 'busy' : 'available');
  await p.save();
};

const step = (fromStates, toStatus, timelineNote, extra) => async (req, res) => {
  try {
    const { order, err } = await loadMyOrder(req);
    if (err) return res.status(err[0]).json({ success: false, message: err[1] });

    // Idempotent: if already at/after this state, just return it.
    if (order.status === toStatus) return res.json({ success: true, order, idempotent: true });
    if (!fromStates.includes(order.status)) {
      return res.status(409).json({ success: false, message: `Cannot move from "${order.status}" to "${toStatus}"` });
    }

    order.status = toStatus;
    order.trackingTimeline.push({ status: toStatus, note: timelineNote });
    if (extra) await extra(order, req);
    await order.save();

    emitOrder(req, order, timelineNote);
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deliveryController = {
  // GET /api/delivery/me
  getMe: async (req, res) => {
    try {
      const { user, partner } = req;
      const unreadNotifications = await Notification.countDocuments({ userId: String(user._id), read: false });
      res.json({
        success: true,
        unreadNotifications,
        partner: {
          userId: user._id,
          name: user.name,
          email: user.email,
          phone: partner.phone || user.phone || '',
          vehicleType: partner.vehicleType,
          isOnline: partner.isOnline,
          availability: partner.availability,
          activeOrderIds: partner.activeOrderIds || [],
          maxConcurrent: partner.maxConcurrent,
          rating: partner.rating,
          completedCount: partner.completedCount,
          failedCount: partner.failedCount,
          lastSeenAt: partner.lastSeenAt,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/delivery/notifications?unreadOnly=1&limit=50
  listNotifications: async (req, res) => {
    try {
      const uid = String(req.user._id);
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const q = { userId: uid };
      if (req.query.unreadOnly === '1' || req.query.unreadOnly === 'true') q.read = false;
      const [notifications, unread] = await Promise.all([
        Notification.find(q).sort({ createdAt: -1 }).limit(limit).lean(),
        Notification.countDocuments({ userId: uid, read: false }),
      ]);
      res.json({ success: true, unread, notifications });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/delivery/notifications/read  { ids?: string[] }  (omit ids = mark all)
  markNotificationsRead: async (req, res) => {
    try {
      const uid = String(req.user._id);
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
      const filter = ids ? { userId: uid, _id: { $in: ids } } : { userId: uid, read: false };
      const r = await Notification.updateMany(filter, { $set: { read: true } });
      res.json({ success: true, updated: r.modifiedCount ?? r.nModified ?? 0 });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/delivery/devices  { token, platform }
  registerDevice: async (req, res) => {
    try {
      const { token, platform } = req.body || {};
      if (!token) return res.status(400).json({ success: false, message: 'token required' });
      await registerDeviceToken({ ownerType: 'partner', ownerId: req.user._id, token, platform });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/delivery/devices/:token
  removeDevice: async (req, res) => {
    try {
      await removeDeviceToken(req.params.token);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // PUT /api/delivery/status  { isOnline }
  setStatus: async (req, res) => {
    try {
      const partner = req.partner;
      const isOnline = req.body.isOnline === true || req.body.isOnline === 'true';

      // Can't go offline while a delivery is in progress.
      if (!isOnline && (partner.activeOrderIds || []).length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Finish your active delivery before going offline.',
        });
      }

      partner.isOnline = isOnline;
      partner.availability = availabilityFor(partner);
      partner.lastSeenAt = new Date();
      await partner.save();

      req.app.get('io')?.to('admin_fleet').emit('fleet_update', fleetPayload(partner, req.user));

      res.json({ success: true, isOnline: partner.isOnline, availability: partner.availability });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/delivery/location  { lat, lng, heading?, speed? }
  updateLocation: async (req, res) => {
    try {
      const lat = Number(req.body.lat);
      const lng = Number(req.body.lng);
      if (!clampLat(lat) || !clampLng(lng)) {
        return res.status(400).json({ success: false, message: 'Invalid coordinates' });
      }

      const partner = req.partner;
      partner.currentLocation = { type: 'Point', coordinates: [lng, lat] };
      partner.locationUpdatedAt = new Date();
      partner.lastSeenAt = new Date();
      if (partner.isOnline) partner.availability = availabilityFor(partner);
      await partner.save();

      const io = req.app.get('io');
      if (io) {
        io.to('admin_fleet').emit('fleet_update', fleetPayload(partner, req.user));
        // Feed the customer live-tracking room(s) for this partner's active order(s).
        for (const oid of partner.activeOrderIds || []) {
          io.to(String(oid)).emit('rider_location_update', {
            orderId: oid,
            lat,
            lng,
            riderName: (req.user.name || '').split(' ')[0],
          });
        }
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/delivery/assignments/:id/accept
  acceptAssignment: async (req, res) => {
    try {
      const result = await acceptOffer({ assignmentId: req.params.id, user: req.user });
      if (!result.ok) return res.status(409).json({ success: false, code: result.code, message: result.message });
      res.json({ success: true, order: result.order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/delivery/assignments/:id/reject  { reason? }
  rejectAssignment: async (req, res) => {
    try {
      const result = await rejectOffer({ assignmentId: req.params.id, user: req.user, reason: req.body.reason });
      if (!result.ok) return res.status(409).json({ success: false, code: result.code, message: 'Offer no longer available' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/delivery/orders/:id  — one order, only if assigned to this partner
  getOrder: async (req, res) => {
    const { order, err } = await loadMyOrder(req);
    if (err) return res.status(err[0]).json({ success: false, message: err[1] });
    // Reveal window: full customer phone only once the parcel is with the rider.
    const revealPhone = ['Out For Delivery', 'Arrived'].includes(order.status);
    const o = order.toObject();
    if (!revealPhone && o.customerPhone) {
      o.customerPhone = o.customerPhone.replace(/(\d{2})\d{4,6}(\d{2})/, '$1••••$2');
    }
    delete o.deliveryOtp; // rider verifies against the customer's copy, never sees it
    res.json({ success: true, order: o });
  },

  // POST /api/delivery/orders/:id/pickup-arrived
  pickupArrived: step(['Assigned', 'Ready'], 'Arrived At Store', 'Delivery partner arrived at the store'),

  // POST /api/delivery/orders/:id/picked-up  → issues the doorstep OTP
  pickedUp: step(['Assigned', 'Arrived At Store'], 'Out For Delivery', 'Order picked up — on the way',
    async (order) => {
      order.pickedUpAt = new Date();
      order.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
      order.otpAttempts = 0;
      await notifyCustomer(order, 'Your order is on the way',
        `Share code ${order.deliveryOtp} with the delivery partner at your door.`);
    }),

  // POST /api/delivery/orders/:id/arrived
  arrived: step(['Out For Delivery'], 'Arrived', 'Delivery partner has arrived'),

  // POST /api/delivery/orders/:id/complete  { otp?, podPhoto? (base64) }
  completeDelivery: async (req, res) => {
    try {
      const { order, err } = await loadMyOrder(req);
      if (err) return res.status(err[0]).json({ success: false, message: err[1] });
      if (order.status === 'Delivered') return res.json({ success: true, order, idempotent: true });
      if (!['Out For Delivery', 'Arrived'].includes(order.status)) {
        return res.status(409).json({ success: false, message: `Cannot complete from "${order.status}"` });
      }

      if (order.deliveryOtp) {
        const otp = String(req.body.otp || '').trim();
        if (otp !== order.deliveryOtp) {
          order.otpAttempts = (order.otpAttempts || 0) + 1;
          await order.save();
          if (order.otpAttempts >= 3) {
            return res.status(400).json({ success: false, code: 'otp_locked', message: 'Too many wrong codes. Mark the delivery as failed or contact support.' });
          }
          return res.status(400).json({ success: false, code: 'otp_wrong', message: `Incorrect code. ${3 - order.otpAttempts} attempt(s) left.` });
        }
      }

      if (req.body.podPhoto) {
        try {
          const up = await uploadToCloudinary(req.body.podPhoto, 'freshcart/delivery-proof');
          order.podPhotoUrl = up.url;
        } catch (_) { /* photo optional — don't block completion */ }
      }

      order.status = 'Delivered';
      order.deliveredAt = new Date();
      order.deliveryOtp = undefined;
      if (/cash|cod/i.test(order.paymentMethod || '')) order.paymentStatus = 'Paid';
      order.trackingTimeline.push({ status: 'Delivered', note: 'Order delivered' });
      await order.save();

      await Assignment.updateOne(
        { orderId: order.orderId, partnerUserId: req.user._id, status: 'accepted' },
        { $set: { status: 'completed', respondedAt: new Date() } }
      );
      await DeliveryPartner.updateOne({ userId: req.user._id }, { $inc: { completedCount: 1 } });
      await freePartnerFromOrder(req.user._id, order.orderId);

      emitOrder(req, order, 'Order delivered');
      req.app.get('io')?.to('admin_fleet').emit('assignment_completed', { orderId: order.orderId, partnerUserId: String(req.user._id) });
      await notifyCustomer(order, 'Order delivered', `Your order ${order.orderId} has been delivered. Enjoy!`);

      res.json({ success: true, order });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // POST /api/delivery/orders/:id/fail  { reason }
  failDelivery: async (req, res) => {
    try {
      const { order, err } = await loadMyOrder(req);
      if (err) return res.status(err[0]).json({ success: false, message: err[1] });
      const reason = String(req.body.reason || '').trim();
      if (!reason) return res.status(400).json({ success: false, message: 'A reason is required' });
      if (['Delivered', 'Failed', 'Cancelled'].includes(order.status)) {
        return res.status(409).json({ success: false, message: `Order is already ${order.status}` });
      }

      order.status = 'Failed';
      order.failureReason = reason;
      order.deliveryOtp = undefined;
      order.trackingTimeline.push({ status: 'Failed', note: `Delivery failed: ${reason}` });
      await order.save();

      await Assignment.updateOne(
        { orderId: order.orderId, partnerUserId: req.user._id, status: 'accepted' },
        { $set: { status: 'failed', reason, respondedAt: new Date() } }
      );
      await DeliveryPartner.updateOne({ userId: req.user._id }, { $inc: { failedCount: 1 } });
      await freePartnerFromOrder(req.user._id, order.orderId);

      emitOrder(req, order, `Delivery failed: ${reason}`);
      req.app.get('io')?.to('admin_fleet').emit('assignment_failed', { orderId: order.orderId, reason });
      try {
        const admins = await User.find({ role: { $in: ['Admin', 'Manager'] } }).select('_id');
        await Notification.insertMany(admins.map((a) => ({
          userId: String(a._id), title: 'Delivery failed',
          body: `Order ${order.orderId}: ${reason}. Needs a reattempt or refund.`, type: 'Order',
        })));
      } catch (_) {}

      res.json({ success: true, order });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  // GET /api/delivery/orders/active
  getActiveOrders: async (req, res) => {
    try {
      const ids = req.partner.activeOrderIds || [];
      const orders = await Order.find({ orderId: { $in: ids } }).sort({ updatedAt: -1 });
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/delivery/auth/forgot  { email }
  forgotPassword: async (req, res) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const user = await User.findOne({ email, role: 'Delivery' });
      // Always 200 to avoid leaking which emails exist.
      if (!user) return res.json({ success: true, message: 'If that account exists, a reset code has been sent.' });

      const code = String(Math.floor(100000 + Math.random() * 900000));
      user.resetCodeHash = await bcrypt.hash(code, 8);
      user.resetCodeExpires = new Date(Date.now() + RESET_TTL_MS);
      await user.save();

      // TODO: send by email once SMTP is configured.
      return res.json({
        success: true,
        message: 'Reset code generated.',
        ...(RESET_TEST_MODE() ? { testMode: true, devCode: code } : {}),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/delivery/auth/reset  { email, code, password }
  resetPassword: async (req, res) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const code = String(req.body.code || '').trim();
      const password = String(req.body.password || '');
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }

      const user = await User.findOne({ email, role: 'Delivery' });
      if (!user || !user.resetCodeHash || !user.resetCodeExpires) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
      }
      if (user.resetCodeExpires.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'Reset code expired' });
      }
      const ok = await bcrypt.compare(code, user.resetCodeHash);
      if (!ok) return res.status(400).json({ success: false, message: 'Incorrect reset code' });

      user.password = password; // pre-save hook hashes it
      user.resetCodeHash = undefined;
      user.resetCodeExpires = undefined;
      await user.save();

      res.json({ success: true, message: 'Password updated. Please sign in.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
