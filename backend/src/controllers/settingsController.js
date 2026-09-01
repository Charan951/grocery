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

// 8. SETTINGS CONTROLLER
// ==========================================
export const settingsController = {
  getSettings: async (req, res) => {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      let settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
      res.json({ success: true, settings });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/app/config  (public) — customer-app runtime config: version gate,
  // maintenance flag, support contacts. Kept small and cache-friendly.
  getAppConfig: async (req, res) => {
    try {
      const s = await Settings.findOne();
      const c = (s && s.appConfig) || {};
      res.json({
        success: true,
        config: {
          minSupportedVersion: c.minSupportedVersion || '1.0.0',
          latestVersion: c.latestVersion || c.minSupportedVersion || '1.0.0',
          maintenance: !!c.maintenance,
          maintenanceMessage:
            c.maintenanceMessage ||
            'FreshCart is briefly down for maintenance. Please try again shortly.',
          updateUrl: c.updateUrl || '',
          supportEmail: (s && s.supportEmail) || 'support@freshcart.com',
          supportPhone: (s && s.supportPhone) || '',
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================

