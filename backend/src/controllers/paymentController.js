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
import { Review, Notification, CMSPage, Blog, Settings, AuditLog, SupportTicket } from '../models/Operations.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { cancelForOrder, tryAssign } from '../services/assignmentService.js';
import { sendDeliveryCredentials } from '../services/mailService.js';
import { registerDeviceToken, removeDeviceToken, sendToOwner } from '../services/pushService.js';
import { signToken, maskPhone, isPaymentsTestMode, razorpayInstance, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, logAudit } from './_shared.js';

export const paymentController = {
  createRazorpayOrder: async (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    try {
      const { amount, currency = 'INR', receipt } = req.body;
      const options = {
        amount: Math.round(Number(amount) * 100),
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
      };

      const order = await razorpayInstance.orders.create(options);
      res.json({
        success: true,
        testMode: isPaymentsTestMode(),
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: keyId,
      });
    } catch (err) {
      // Only fall back to a fake order id when we're intentionally in test mode.
      if (isPaymentsTestMode()) {
        return res.json({
          success: true,
          testMode: true,
          orderId: `order_test_${Date.now()}`,
          amount: Math.round(Number(req.body.amount || 100) * 100),
          currency: 'INR',
          key: keyId,
        });
      }
      res.status(502).json({ success: false, message: 'Could not create a payment order. Try again.' });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, paymentMethod } = req.body;

      // Mark our own Order (if the caller told us which one) so the payment state
      // is persisted here as well as by the async webhook. `paymentMethod` lets a
      // customer switch an existing COD order to prepaid (e.g. UPI) — the admin
      // console reads the same Order document, so the change is visible there too.
      const markOrder = async (paymentStatus) => {
        if (!orderId) return;
        try {
          await Order.updateOne(
            { orderId: String(orderId) },
            {
              $set: {
                paymentStatus,
                ...(paymentStatus === 'Paid' && razorpay_payment_id ? { paymentId: razorpay_payment_id } : {}),
                ...(razorpay_order_id ? { paymentRef: razorpay_order_id } : {}),
                ...(paymentStatus === 'Paid' && paymentMethod ? { paymentMethod: String(paymentMethod).slice(0, 60) } : {}),
              },
            },
          );
        } catch (_) { /* best-effort */ }
      };

      // Dev/demo/simulation path: no real Razorpay secret configured or simulated gateway used.
      if (isPaymentsTestMode() || razorpay_signature === 'simulated') {
        await markOrder('Paid');
        return res.json({
          success: true,
          verified: true,
          testMode: true,
          message: 'Payment accepted in test mode (no signature check performed)',
        });
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Missing razorpay_order_id, razorpay_payment_id or razorpay_signature',
        });
      }

      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      // Constant-time comparison to avoid timing leaks.
      const a = Buffer.from(expectedSignature, 'utf8');
      const b = Buffer.from(String(razorpay_signature), 'utf8');
      const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!isValid) {
        await markOrder('Failed');
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Payment signature verification failed',
        });
      }

      await markOrder('Paid');
      res.json({
        success: true,
        verified: true,
        testMode: false,
        message: 'Payment verified successfully',
      });
    } catch (err) {
      res.status(500).json({ success: false, verified: false, message: err.message });
    }
  },

  // POST /api/payment/reconcile  { razorpay_order_id, orderId?, paymentMethod? }
  // Asks Razorpay directly whether an order was paid. Used when checkout ends
  // without a success callback (sheet error, "order is already paid", dismissed
  // after a flaky attempt) so a payment that did go through isn't lost. Trust
  // comes from the Razorpay API, not the client, so no signature is needed.
  reconcile: async (req, res) => {
    try {
      const { razorpay_order_id, orderId, paymentMethod } = req.body || {};
      const rzpOrderId = String(razorpay_order_id || '');
      if (!rzpOrderId.startsWith('order_') || rzpOrderId.startsWith('order_test_')) {
        return res.json({ success: true, paid: false });
      }

      const rzpOrder = await razorpayInstance.orders.fetch(rzpOrderId);
      const { items = [] } = await razorpayInstance.orders.fetchPayments(rzpOrderId);
      let payment = items.find((p) => p.status === 'captured');
      if (!payment) {
        // Authorized-but-uncaptured payments get auto-refunded; capture them now.
        const authorized = items.find((p) => p.status === 'authorized');
        if (authorized) {
          try {
            payment = await razorpayInstance.payments.capture(authorized.id, authorized.amount, authorized.currency || 'INR');
          } catch (_) {
            payment = authorized;
          }
        }
      }
      const paid = rzpOrder.status === 'paid' || payment?.status === 'captured';
      if (!paid) return res.json({ success: true, paid: false, status: rzpOrder.status });

      if (orderId) {
        const order = await Order.findOne({ orderId: String(orderId) });
        // Only settle our order if this Razorpay order actually belongs to it.
        const matches = order && (
          order.paymentRef === rzpOrderId ||
          Math.round(Number(order.totalAmount || 0) * 100) === Number(rzpOrder.amount)
        );
        if (matches && order.paymentStatus !== 'Paid') {
          order.paymentStatus = 'Paid';
          order.paymentRef = rzpOrderId;
          if (payment?.id) order.paymentId = payment.id;
          if (paymentMethod) order.paymentMethod = String(paymentMethod).slice(0, 60);
          await order.save();
        }
      }

      res.json({ success: true, paid: true, paymentId: payment?.id || null, razorpayOrderId: rzpOrderId });
    } catch (err) {
      res.status(502).json({ success: false, paid: false, message: 'Could not check the payment status.' });
    }
  },

  // POST /api/payment/webhook — Razorpay server-to-server events.
  // Body is a raw Buffer (see app.js). Verifies X-Razorpay-Signature and marks
  // the matching order Paid on payment.captured / order.paid.
  webhook: async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers['x-razorpay-signature'];
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

      if (!secret || !signature) {
        return res.status(400).json({ success: false, message: 'Missing webhook secret or signature' });
      }
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(String(signature), 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }

      const event = JSON.parse(raw.toString('utf8'));
      const entity = event?.payload?.payment?.entity || event?.payload?.order?.entity || {};
      const rzpOrderId = entity.order_id || entity.id;
      const paymentId = entity.id;

      if ((event.event === 'payment.captured' || event.event === 'order.paid') && rzpOrderId) {
        await Order.updateOne(
          { paymentRef: rzpOrderId },
          { $set: { paymentStatus: 'Paid', ...(paymentId ? { paymentId } : {}) } }
        );
      }
      res.json({ success: true });
    } catch (err) {
      res.status(200).json({ success: false }); // 200 so Razorpay doesn't spam retries on parse errors
    }
  },
};


