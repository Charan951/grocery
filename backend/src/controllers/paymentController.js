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
      console.warn('Razorpay order creation fallback:', err.message);
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
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      // Dev/demo path: no real Razorpay secret configured. Report verified but
      // flag it clearly so the client can gate real order confirmation on env.
      if (isPaymentsTestMode()) {
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
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Payment signature verification failed',
        });
      }

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
      console.warn('Razorpay webhook error:', err.message);
      res.status(200).json({ success: false }); // 200 so Razorpay doesn't spam retries on parse errors
    }
  },
};


