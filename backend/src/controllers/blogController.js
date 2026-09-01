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

// 7. BLOG CONTROLLER
// ==========================================
export const blogController = {
  getBlogs: async (req, res) => {
    try {
      const list = await Blog.find().sort({ createdAt: -1 });
      res.json({ success: true, blogs: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createBlog: async (req, res) => {
    try {
      const blogData = req.body;
      if (!blogData.id) {
        blogData.id = 'blog_' + Date.now();
      }
      if (!blogData.date) {
        blogData.date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
      const blog = await Blog.create(blogData);
      res.status(201).json({ success: true, blog });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteBlog: async (req, res) => {
    try {
      await Blog.findOneAndDelete({ id: req.params.id });
      res.json({ success: true, message: 'Article deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateBlog: async (req, res) => {
    try {
      const blog = await Blog.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
      if (!blog) return res.status(404).json({ success: false, message: 'Blog article not found' });
      res.json({ success: true, blog });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================

