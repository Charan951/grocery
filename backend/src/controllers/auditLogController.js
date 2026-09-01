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

export const auditLogController = {
  getAuditLogs: async (req, res) => {
    try {
      const list = await AuditLog.find().sort({ timestamp: -1 });
      res.json({ success: true, logs: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  clearAuditLogs: async (req, res) => {
    try {
      await AuditLog.deleteMany({});
      res.json({ success: true, message: 'Audit logs cleared' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};


