import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { DeliveryPartner } from '../models/DeliveryPartner.js';
import { Category, Product, Brand, SpecialGroup, Banner, PromoCard } from '../models/Catalog.js';
import { Inventory } from '../models/Inventory.js';
import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { Coupon, Offer, Payment, WalletTransaction } from '../models/Finance.js';
import { FestivalCampaign } from '../models/FestivalCampaign.js';
import { Review, Notification, CMSPage, Blog, Settings, AuditLog, SupportTicket } from '../models/Operations.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { cancelForOrder, tryAssign } from '../services/assignmentService.js';
import { sendDeliveryCredentials } from '../services/mailService.js';
import { registerDeviceToken, removeDeviceToken, sendToOwner } from '../services/pushService.js';
import { signToken, maskPhone, isPaymentsTestMode, razorpayInstance, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, logAudit } from './_shared.js';

// ==========================================
// 5. ORDER CONTROLLER
// ==========================================
export const orderController = {
  getOrders: async (req, res) => {
    try {
      const list = await Order.find().sort({ createdAt: -1 });
      res.json({ success: true, orders: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getCustomerOrders: async (req, res) => {
    try {
      const { phone } = req.params;
      const list = await Order.find({ customerPhone: phone }).sort({ createdAt: -1 });
      res.json({ success: true, orders: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/orders/mine  (protectCustomer)
  getMyOrders: async (req, res) => {
    try {
      const cid = req.customer.customerId;
      const phone10 = String(req.customer.phone || '').replace(/\D/g, '').slice(-10);
      const list = await Order.find({
        $or: [
          { customerId: cid },
          ...(phone10 ? [{ customerPhone: new RegExp(phone10 + '$') }] : [])
        ]
      }).sort({ createdAt: -1 });
      res.json({ success: true, orders: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getOrder: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      // Ownership: a customer token may only read its own order.
      let isOwner = false;
      if (req.customer) {
        const phone10 = String(req.customer.phone || '').replace(/\D/g, '').slice(-10);
        isOwner = order.customerId === req.customer.customerId
          || (!!phone10 && String(order.customerPhone || '').endsWith(phone10));
        if (!isOwner) return res.status(403).json({ success: false, message: 'Not your order' });
      }

      const view = order.toObject();

      // The rider verifies against the customer's OTP — only the authenticated
      // owner sees it, and only once the order is actually out for delivery.
      const REVEAL = ['Out For Delivery', 'Arrived'];
      if (!(isOwner && REVEAL.includes(order.status))) delete view.deliveryOtp;
      if (!isOwner) view.customerPhone = maskPhone(order.customerPhone);

      // Rider tracking block for the customer map — masked until the reveal window.
      if (order.deliveryPartnerUserId && !['Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(order.status)) {
        const partner = await DeliveryPartner.findOne({ userId: order.deliveryPartnerUserId }).lean();
        const revealed = REVEAL.includes(order.status);
        const rawPhone = partner?.phone || order.deliveryPartnerPhone || '';
        view.delivery = {
          partnerName: String(order.deliveryPartnerName || 'Delivery partner').split(' ')[0],
          phoneMasked: maskPhone(rawPhone),
          phone: revealed ? rawPhone : null,
          canContact: revealed && !!rawPhone,
          revealed,
          vehicleType: partner?.vehicleType || null,
          rating: partner?.rating ?? null,
          location: revealed && partner?.currentLocation?.coordinates
            ? { lat: partner.currentLocation.coordinates[1], lng: partner.currentLocation.coordinates[0] }
            : null,
          locationUpdatedAt: revealed ? partner?.locationUpdatedAt || null : null,
        };
      }
      view.pickup = view.pickup || null;

      res.json({ success: true, order: view });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createOrder: async (req, res) => {
    try {
      const orderData = req.body || {};
      // When the request carries a valid customer token (attachCustomerOptional),
      // trust the server-side identity over anything in the body.
      const authedCustomer = req.customer || null;
      const cleanPhone = (
        authedCustomer?.phone || orderData.customerPhone || orderData.phone || '9626626626'
      ).replace(/\D/g, '').slice(-10);

      // Fetch active festival campaign for server-side pricing verification
      const now = new Date();
      const activeCampaign = await FestivalCampaign.findOne({
        isActive: true,
        status: { $ne: 'draft' },
        startDate: { $lte: now },
        endDate: { $gte: now }
      });

      const productDiscountMap = new Map();
      if (activeCampaign && Array.isArray(activeCampaign.festivalGroups)) {
        for (const grp of activeCampaign.festivalGroups) {
          if (grp.isActive !== false && grp.discountPercent > 0 && Array.isArray(grp.products)) {
            for (const pid of grp.products) {
              if (pid) productDiscountMap.set(String(pid), grp.discountPercent);
            }
          }
        }
      }

      const rawItems = Array.isArray(orderData.items) ? orderData.items : [];
      const validatedItems = await Promise.all(
        rawItems.map(async (it) => {
          const prodId = String(it.productId || it.id || 'p_1');
          let dbProduct = null;
          if (mongoose.Types.ObjectId.isValid(prodId)) {
            dbProduct = await Product.findById(prodId);
          }
          if (!dbProduct) {
            dbProduct = await Product.findOne({ $or: [{ id: prodId }, { _id: prodId }] });
          }

          const basePrice = dbProduct ? Number(dbProduct.price || 50) : Number(it.price || 50);
          let discountPct = productDiscountMap.get(prodId) || 0;
          if (!discountPct && dbProduct) {
            discountPct = productDiscountMap.get(String(dbProduct.id)) || productDiscountMap.get(String(dbProduct._id)) || 0;
          }

          const finalPrice = discountPct > 0 ? Math.round(basePrice * (1 - discountPct / 100)) : basePrice;

          return {
            id: prodId,
            productId: prodId,
            name: dbProduct?.name || it.name || it.product?.name || 'Grocery Item',
            weightSpec: it.weightSpec || it.selectedWeight || '500g',
            quantity: Number(it.quantity || it.qty || 1),
            qty: Number(it.quantity || it.qty || 1),
            price: finalPrice,
            image: dbProduct?.imageUrl || it.image || it.product?.imageUrl || ''
          };
        })
      );

      const calculatedSubtotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const normalizedOrder = {
        orderId: orderData.orderId || orderData.orderNumber || 'PNNHJHTYP' + Math.floor(100000 + Math.random() * 900000),
        customerId: authedCustomer?.customerId || orderData.customerId || 'cust_' + cleanPhone,
        customerName: authedCustomer?.name || orderData.customerName || 'Customer',
        customerPhone: `+91 ${cleanPhone}`,
        items: validatedItems,
        itemTotal: calculatedSubtotal,
        totalAmount: calculatedSubtotal + Number(orderData.deliveryFee || 0) + Number(orderData.handlingFee || 0) - Number(orderData.discount || 0),
        discount: Number(orderData.discount || 0),
        deliveryFee: Number(orderData.deliveryFee || 0),
        handlingFee: Number(orderData.handlingFee || 0),
        // COD/cash is collected on delivery — it is Pending until then, never
        // "Paid" on creation. Prepaid methods default to Paid unless the caller
        // says otherwise (e.g. a failed gateway attempt).
        paymentStatus: orderData.paymentStatus
          || (/cod|cash/i.test(orderData.paymentMethod || '') ? 'Pending' : 'Paid'),
        paymentMethod: orderData.paymentMethod || 'Razorpay UPI/Card',
        paymentId: orderData.paymentId || undefined,
        paymentRef: orderData.paymentRef || orderData.razorpayOrderId || undefined,
        status: orderData.status || 'In Transit',
        deliveryAddress: typeof orderData.deliveryAddress === 'string'
          ? orderData.deliveryAddress
          : orderData.address?.fullAddress || 'Selected Delivery Address'
      };

      // Resolve drop coordinates (for dispatch / ETA) + dark-store pickup origin.
      const dropLat = Number(orderData.deliveryLat ?? orderData.address?.lat ?? orderData.lat);
      const dropLng = Number(orderData.deliveryLng ?? orderData.address?.lng ?? orderData.lng);
      if (Number.isFinite(dropLat) && Number.isFinite(dropLng)) {
        normalizedOrder.deliveryLocation = { lat: dropLat, lng: dropLng };
      }
      try {
        const s = await Settings.findOne();
        if (s?.storeOrigin) normalizedOrder.pickup = { name: s.storeOrigin.name, lat: s.storeOrigin.lat, lng: s.storeOrigin.lng };
      } catch (_) {}

      let order;
      try {
        order = await Order.create(normalizedOrder);
        // Reconciliation record (best-effort).
        Payment.create({
          transactionId: normalizedOrder.paymentId || `txn_${normalizedOrder.orderId}`,
          orderId: normalizedOrder.orderId,
          customerId: normalizedOrder.customerId,
          amount: normalizedOrder.totalAmount,
          status: normalizedOrder.paymentStatus === 'Paid' ? 'Success' : 'Pending',
          gateway: normalizedOrder.paymentMethod?.toLowerCase().includes('wallet') ? 'Wallet' : 'Razorpay',
        }).catch(() => {});
        if (normalizedOrder.items && Array.isArray(normalizedOrder.items)) {
          for (const item of normalizedOrder.items) {
            if (item.productId) {
              // Product.stock is an object { status, quantity } — decrement the
              // nested quantity, not the object itself.
              await Product.updateOne(
                { id: item.productId },
                { $inc: { 'stock.quantity': -Number(item.quantity || 0) } }
              ).catch(() => { });
            }
          }
        }
      } catch (dbErr) {
        console.warn('Order DB create note:', dbErr.message);
        order = { ...normalizedOrder, _id: 'ord_mock_' + Date.now() };
      }

      const io = req.app.get('io');
      if (io) {
        io.to(normalizedOrder.orderId).emit('order_status_update', {
          orderId: normalizedOrder.orderId,
          status: order.status || normalizedOrder.status,
          note: 'Order placed',
          eta: order.estimatedDelivery,
          at: new Date().toISOString(),
        });
      }

      res.status(201).json({ success: true, order });
    } catch (err) {
      console.warn('createOrder fallback note:', err.message);
      res.status(201).json({ success: true, order: { orderId: 'PNNHJHTYP' + Date.now(), status: 'In Transit' } });
    }
  },

  // POST /api/orders/:id/cancel  { reason, phone? }  (attachCustomerOptional)
  // Customer self-service cancel — identity from the app's customer token, or
  // from a { phone } in the body for the token-less web storefront. Allowed
  // only before the order leaves the store; a prepaid order is refunded to
  // the wallet.
  cancelOrder: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      let cust = req.customer;
      if (!cust) {
        const raw = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
        if (raw) cust = await Customer.findOne({ phone: new RegExp(raw + '$') });
      }
      if (!cust) {
        return res.status(401).json({ success: false, message: 'Sign in to cancel this order' });
      }
      const phone10 = String(cust.phone || '').replace(/\D/g, '').slice(-10);
      const owns = order.customerId === cust.customerId
        || (phone10 && String(order.customerPhone || '').endsWith(phone10));
      if (!owns) return res.status(403).json({ success: false, message: 'Not your order' });

      if (order.status === 'Cancelled') {
        return res.status(409).json({ success: false, message: 'Order is already cancelled' });
      }
      const CANCELLABLE = ['Pending', 'In Transit', 'Accepted', 'Packed', 'Ready'];
      if (!CANCELLABLE.includes(order.status)) {
        return res.status(409).json({
          success: false,
          message: `An order that is ${order.status.toLowerCase()} can no longer be cancelled`,
        });
      }

      const reason = String(req.body.reason || '').trim().slice(0, 300) || 'Cancelled by customer';
      order.status = 'Cancelled';
      order.failureReason = reason;
      order.trackingTimeline.push({ status: 'Cancelled', note: reason });

      // Release any rider that was already offered/assigned this order.
      await cancelForOrder(order.orderId, 'order cancelled').catch(() => {});
      order.deliveryPartnerUserId = undefined;
      order.assignmentId = undefined;

      // Refund a prepaid (non-COD) order to the wallet.
      let walletBalance;
      const isCod = /cod|cash/i.test(order.paymentMethod || '');
      const refunded = order.paymentStatus === 'Paid' && Number(order.totalAmount) > 0 && !isCod;
      if (refunded) {
        const amt = Number(order.totalAmount);
        cust.walletBalance = (cust.walletBalance || 0) + amt;
        await cust.save();
        walletBalance = cust.walletBalance;
        order.paymentStatus = 'Refunded';
        await WalletTransaction.create({
          customerId: cust.customerId,
          amount: amt,
          type: 'Credit',
          description: `Refund for cancelled order ${order.orderId}`,
        });
      }

      await order.save();

      const io = req.app.get('io');
      if (io) {
        io.to(order.orderId).emit('order_status_update', {
          orderId: order.orderId,
          status: 'Cancelled',
          note: reason,
          timeline: order.trackingTimeline,
          at: new Date().toISOString(),
        });
      }

      res.json({ success: true, order, refunded, walletBalance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/orders/:id/rate-partner  { stars (1-5), comment? }
  // attachCustomerOptional — app customer token OR { phone } in the body (web).
  // Only the order owner, only after Delivered, one rating per order (re-submit
  // to edit). Recomputes DeliveryPartner.rating/ratingCount from every rated
  // order for that partner.
  ratePartner: async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      let cust = req.customer;
      if (!cust) {
        const raw = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
        if (raw) cust = await Customer.findOne({ phone: new RegExp(raw + '$') });
      }
      if (!cust) return res.status(401).json({ success: false, message: 'Sign in to rate this delivery' });

      const phone10 = String(cust.phone || '').replace(/\D/g, '').slice(-10);
      const owns = order.customerId === cust.customerId
        || (phone10 && String(order.customerPhone || '').endsWith(phone10));
      if (!owns) return res.status(403).json({ success: false, message: 'Not your order' });

      if (order.status !== 'Delivered') {
        return res.status(409).json({ success: false, message: 'You can rate the delivery only after it is delivered' });
      }
      if (!order.deliveryPartnerUserId) {
        return res.status(409).json({ success: false, message: 'This order had no delivery partner to rate' });
      }

      const stars = Number(req.body.stars ?? req.body.rating);
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      const comment = String(req.body.comment || '').trim().slice(0, 500);

      order.deliveryRating = { stars: Math.round(stars), comment: comment || undefined, at: new Date() };
      await order.save();

      // Recompute the partner's aggregate rating from all their rated orders.
      const partnerUserId = order.deliveryPartnerUserId;
      const [agg] = await Order.aggregate([
        { $match: { deliveryPartnerUserId: partnerUserId, 'deliveryRating.stars': { $gte: 1 } } },
        { $group: { _id: null, avg: { $avg: '$deliveryRating.stars' }, count: { $sum: 1 } } },
      ]);
      const ratingCount = agg?.count || 0;
      const rating = agg ? Math.round(agg.avg * 100) / 100 : 5;
      await DeliveryPartner.updateOne({ userId: partnerUserId }, { $set: { rating, ratingCount } });

      // Low-rating alert for ops.
      if (order.deliveryRating.stars <= 2) {
        try {
          const admins = await User.find({ role: { $in: ['Admin', 'Manager'] } }).select('_id');
          await Notification.insertMany(admins.map((a) => ({
            userId: String(a._id),
            title: 'Low delivery rating',
            body: `Order ${order.orderId} rated ${order.deliveryRating.stars}★${comment ? `: "${comment}"` : ''}.`,
            type: 'Order',
          })));
        } catch (_) {}
      }

      res.json({ success: true, deliveryRating: order.deliveryRating, partnerRating: rating, partnerRatingCount: ratingCount });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status, note, deliveryPartnerId, deliveryPartnerName } = req.body;
      const order = await Order.findOne({ orderId: req.params.id });
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      order.status = status;
      if (deliveryPartnerId) {
        order.deliveryPartnerId = deliveryPartnerId;
        order.deliveryPartnerName = deliveryPartnerName;
      }
      order.trackingTimeline.push({
        status,
        note: note || `Order status updated to ${status}.`
      });

      if (status === 'Delivered') {
        order.paymentStatus = 'Paid';
        order.deliveredAt = order.deliveredAt || new Date();
      }

      // If an assigned order gets cancelled here, release the partner + revoke.
      if (['Cancelled', 'Returned', 'Refunded'].includes(status)) {
        await cancelForOrder(order.orderId, `order ${status.toLowerCase()}`).catch(() => {});
        order.deliveryPartnerUserId = undefined;
        order.assignmentId = undefined;
      }

      await order.save();

      // Auto-dispatch: when an order becomes Ready with no partner, offer it to
      // the nearest available rider (P1-D1). Non-blocking, opt-out via Settings.
      if (status === 'Ready' && !order.deliveryPartnerUserId) {
        Settings.findOne()
          .then((s) => {
            if (!s || s.autoAssignEnabled !== false) return tryAssign(order.orderId);
          })
          .catch(() => {});
      }

      // Push the change to anyone watching this order's room.
      const io = req.app.get('io');
      if (io) {
        io.to(order.orderId).emit('order_status_update', {
          orderId: order.orderId,
          status: order.status,
          note: order.trackingTimeline.at(-1)?.note || '',
          eta: order.estimatedDelivery,
          timeline: order.trackingTimeline,
          at: new Date().toISOString(),
        });
      }

      // FCM to the customer's devices for the milestones they care about.
      const PUSHABLE = {
        'Out For Delivery': 'Your order is on the way',
        Arrived: 'Your delivery partner has arrived',
        Delivered: 'Order delivered',
        Cancelled: 'Order cancelled',
      };
      if (PUSHABLE[order.status] && order.customerId) {
        sendToOwner(order.customerId, {
          title: PUSHABLE[order.status],
          body: `Order ${order.orderId} is now ${order.status}.`,
          data: { type: 'order_update', orderId: order.orderId, status: order.status },
        }).catch(() => {});
      }

      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/orders/:id/rider-location  { lat, lng, etaMinutes }  (staff/delivery)
  // A rider/dispatch producer for the tracking map. Emits to the order room.
  updateRiderLocation: async (req, res) => {
    try {
      const { lat, lng, etaMinutes, riderName, riderPhone } = req.body;
      const io = req.app.get('io');
      if (io) {
        io.to(req.params.id).emit('rider_location_update', {
          orderId: req.params.id,
          lat: Number(lat),
          lng: Number(lng),
          etaMinutes: etaMinutes != null ? Number(etaMinutes) : undefined,
          riderName,
          riderPhone,
        });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};


