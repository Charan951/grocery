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

// ==========================================
// 6. COUPON CONTROLLER
// ==========================================
// Single source of truth for coupon eligibility + discount. Used by both the
// validate endpoint and createOrder so web / Flutter can't diverge.
// `ctx.isFirstOrder`: true / false when the customer is known, null for a guest.
export const evaluateCoupon = (coupon, subtotal, ctx = {}) => {
  if (!coupon || coupon.active === false) return { ok: false, discount: 0, message: 'This coupon is not valid' };
  if (coupon.firstOrderOnly) {
    if (ctx.isFirstOrder === false) {
      return { ok: false, discount: 0, message: `${coupon.code} is only valid on your first order` };
    }
    if (ctx.isFirstOrder !== true) {
      return { ok: false, discount: 0, message: `Log in to use ${coupon.code} on your first order` };
    }
  }
  if (subtotal < (coupon.minOrder || 0)) {
    return { ok: false, discount: 0, message: `Add items worth ₹${(coupon.minOrder - subtotal).toFixed(0)} more to use ${coupon.code}` };
  }
  let discount = coupon.isPercent
    ? Math.round((subtotal * Number(coupon.value)) / 100)
    : Number(coupon.value);
  // Percentage coupons are capped at ₹100 (matches the web storefront).
  if (coupon.isPercent) discount = Math.min(discount, 100);
  discount = Math.max(0, Math.min(discount, subtotal));
  return { ok: true, discount, message: `${coupon.code} applied — you saved ₹${discount}` };
};

// A customer is "new" until they have an order that wasn't cancelled/failed.
// Matches on customerId and phone, since guest orders are keyed by phone.
export const isFirstOrderFor = async ({ customer, phone } = {}) => {
  const digits = String(customer?.phone || phone || '').replace(/\D/g, '').slice(-10);
  const ids = [customer?.customerId, digits && `cust_${digits}`].filter(Boolean);
  if (!ids.length && !digits) return null;
  const or = [];
  if (ids.length) or.push({ customerId: { $in: ids } });
  if (digits) or.push({ customerPhone: `+91 ${digits}` });
  const prior = await Order.countDocuments({ $or: or, status: { $nin: ['Cancelled', 'Failed'] } });
  return prior === 0;
};

export const findCouponByCode = (raw) => {
  const code = String(raw || '').trim().toUpperCase();
  if (!code || !/^[A-Z0-9_-]+$/.test(code)) return null;
  return Coupon.findOne({ code });
};

export const couponController = {
  getCoupons: async (req, res) => {
    try {
      const list = await Coupon.find().sort({ createdAt: -1 });
      res.json({ success: true, coupons: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/coupons/validate  { code, subtotal }
  // Server-side discount calc so the client can't fabricate one.
  validateCoupon: async (req, res) => {
    try {
      const code = String(req.body.code || '').trim().toUpperCase();
      const subtotal = Number(req.body.subtotal) || 0;
      if (!code) {
        return res.status(400).json({ success: false, valid: false, message: 'Coupon code is required' });
      }

      const coupon = await findCouponByCode(code);
      const isFirstOrder = coupon?.firstOrderOnly ? await isFirstOrderFor({ customer: req.customer }) : null;
      const r = evaluateCoupon(coupon, subtotal, { isFirstOrder });
      if (!r.ok) return res.json({ success: true, valid: false, discount: 0, message: r.message });
      const discount = r.discount;

      res.json({
        success: true,
        valid: true,
        code: coupon.code,
        discount,
        description: coupon.description || coupon.discount,
        message: `${coupon.code} applied — you saved ₹${discount}`
      });
    } catch (err) {
      res.status(500).json({ success: false, valid: false, message: err.message });
    }
  },

  // POST /api/coupons/available  { subtotal }  (customer token optional)
  // Every active coupon this shopper can see, with whether the current cart
  // unlocks it, how much more is needed, and the saving. For a new customer,
  // `autoApplyCode` names the best first-order coupon the cart qualifies for.
  availableCoupons: async (req, res) => {
    try {
      const subtotal = Math.max(0, Number(req.body.subtotal) || 0);
      const isFirstOrder = await isFirstOrderFor({ customer: req.customer });
      const all = await Coupon.find({ active: { $ne: false } }).lean();

      const coupons = all
        // Returning customers never see first-order coupons.
        .filter((c) => !(c.firstOrderOnly && isFirstOrder === false))
        .map((c) => {
          const minOrder = Number(c.minOrder) || 0;
          const r = evaluateCoupon(c, subtotal, { isFirstOrder });
          // What the coupon would save once unlocked, for the "add ₹X more" nudge.
          const potential = evaluateCoupon(c, Math.max(subtotal, minOrder), { isFirstOrder: true });
          return {
            code: c.code,
            discount: c.discount,
            description: c.description || '',
            minOrder,
            value: c.value,
            isPercent: !!c.isPercent,
            firstOrderOnly: !!c.firstOrderOnly,
            eligible: r.ok,
            amountNeeded: Math.max(0, Math.ceil(minOrder - subtotal)),
            savings: r.ok ? r.discount : potential.discount,
            message: r.ok ? `Save ₹${r.discount} on this order` : r.message,
          };
        })
        .sort((a, b) =>
          (b.eligible - a.eligible)
          || (a.eligible ? b.savings - a.savings : a.amountNeeded - b.amountNeeded));

      const autoApply = isFirstOrder
        ? coupons.filter((c) => c.firstOrderOnly && c.eligible).sort((a, b) => b.savings - a.savings)[0]
        : null;

      res.json({ success: true, isFirstOrder, autoApplyCode: autoApply?.code || null, coupons });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createCoupon: async (req, res) => {
    try {
      const coupon = await Coupon.create(req.body);
      res.status(201).json({ success: true, coupon });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      await Coupon.findOneAndDelete({ code: req.params.code });
      res.json({ success: true, message: 'Coupon deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateCoupon: async (req, res) => {
    try {
      const coupon = await Coupon.findOneAndUpdate({ code: req.params.code }, req.body, { new: true });
      if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
      res.json({ success: true, coupon });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================

