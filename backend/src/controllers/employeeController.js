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

export const employeeController = {
  getEmployees: async (req, res) => {
    try {
      const list = await User.find({ role: { $ne: 'Customer' } }).sort({ name: 1 });
      res.json({ success: true, employees: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  createEmployee: async (req, res) => {
    try {
      const { name, email, phone, role } = req.body;
      const plainPassword = req.body.password || (role === 'Delivery' ? 'delivery123' : 'staff123');
      const employee = await User.create({
        name,
        email,
        phone,
        password: plainPassword,
        role: role || 'Employee',
        status: 'Active'
      });

      // Create DeliveryPartner doc immediately so it shows up in delivery partner management lists
      if ((role || '') === 'Delivery') {
        await DeliveryPartner.findOneAndUpdate(
          { userId: employee._id },
          { userId: employee._id, phone: employee.phone || '' },
          { upsert: true, new: true }
        ).catch((e) => console.warn('[DeliveryPartner] create note:', e?.message || e));

        if (email) {
          sendDeliveryCredentials({
            to: email,
            name,
            email,
            password: plainPassword,
            mode: 'created',
          }).catch((e) => console.error('[mail] createEmployee credentials:', e?.message || e));
        }
      }

      res.status(201).json({ success: true, employee });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  updateEmployee: async (req, res) => {
    try {
      const employee = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
      res.json({ success: true, employee });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  deleteEmployee: async (req, res) => {
    try {
      const employee = await User.findByIdAndDelete(req.params.id);
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
      res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// Recompute a product's aggregate rating from its Approved reviews.

