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

      const coupon = await Coupon.findOne({ code: new RegExp(`^${code}$`, 'i') });
      if (!coupon || coupon.active === false) {
        return res.json({ success: true, valid: false, discount: 0, message: 'This coupon is not valid' });
      }
      if (subtotal < (coupon.minOrder || 0)) {
        return res.json({
          success: true,
          valid: false,
          discount: 0,
          message: `Add items worth ₹${(coupon.minOrder - subtotal).toFixed(0)} more to use ${coupon.code}`
        });
      }

      let discount = coupon.isPercent
        ? Math.round((subtotal * Number(coupon.value)) / 100)
        : Number(coupon.value);
      // Percentage coupons are capped at ₹100 (matches the web storefront).
      if (coupon.isPercent) discount = Math.min(discount, 100);
      discount = Math.max(0, Math.min(discount, subtotal));

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

