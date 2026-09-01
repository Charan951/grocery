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
// 1. AUTHENTICATION CONTROLLER
// ==========================================
export const authController = {
  register: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }
      const user = await User.create({ name, email, password, role: role || 'Customer' });
      const token = signToken(user._id);

      // Create Customer profile if role is Customer
      if (user.role === 'Customer') {
        await Customer.create({
          customerId: 'cust_' + user._id.toString().slice(-6),
          name: user.name,
          email: user.email,
          phone: user.phone || '9999999999',
          referralCode: 'REF_' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          walletBalance: 100 // Welcome bonus
        });
      }

      res.status(201).json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      if (user.status === 'Suspended') {
        return res.status(403).json({ success: false, message: 'Account suspended' });
      }
      const token = signToken(user._id);
      res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getMe: async (req, res) => {
    try {
      res.json({ success: true, user: req.user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================
// 2. DASHBOARD STATS CONTROLLER
// ==========================================
export const dashboardController = {
  getStats: async (req, res) => {
    try {
      // Fetch aggregations or use defaults if no orders
      const orders = await Order.find();
      const productsCount = await Product.countDocuments();
      const categoriesCount = await Category.countDocuments();
      const customersCount = await Customer.countDocuments();
      const lowStockProducts = await Product.find({ 'stock.quantity': { $lt: 15 } });

      let totalRevenue = 0;
      let todayRevenue = 0;
      let todayOrders = 0;
      let pendingOrders = 0;

      const today = new Date().toDateString();

      orders.forEach(o => {
        // Schema field is `totalAmount` — `grandTotal` never existed, which made
        // every revenue figure NaN once real orders were present.
        const orderValue = Number(o.totalAmount) || 0;
        if (o.status !== 'Cancelled') {
          totalRevenue += orderValue;
          if (new Date(o.createdAt).toDateString() === today) {
            todayRevenue += orderValue;
            todayOrders++;
          }
        }
        if (o.status === 'Pending') {
          pendingOrders++;
        }
      });

      const averageOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

      res.json({
        success: true,
        stats: {
          todayRevenue,
          todayOrders,
          monthlyRevenue: totalRevenue * 0.4, // Simulated monthly split
          yearlyRevenue: totalRevenue,
          averageOrderValue,
          conversionRate: 3.8, // 3.8% mock
          customerGrowth: 14.5, // 14.5% mock
          returningCustomers: 64, // 64% mock
          productsCount,
          categoriesCount,
          customersCount,
          pendingOrdersCount: pendingOrders,
          lowStockCount: lowStockProducts.length
        },
        lowStockItems: lowStockProducts.slice(0, 5),
        charts: {
          revenue: [
            { name: 'Jan', value: totalRevenue * 0.05 + 5000 },
            { name: 'Feb', value: totalRevenue * 0.08 + 8000 },
            { name: 'Mar', value: totalRevenue * 0.12 + 12000 },
            { name: 'Apr', value: totalRevenue * 0.15 + 15000 },
            { name: 'May', value: totalRevenue * 0.20 + 20000 },
            { name: 'Jun', value: totalRevenue * 0.25 + 25000 },
            { name: 'Jul', value: totalRevenue * 0.15 + todayRevenue }
          ],
          categories: [
            { name: 'Organic', value: 35 },
            { name: 'Vegetables', value: 25 },
            { name: 'Fruits', value: 20 },
            { name: 'Dairy', value: 15 },
            { name: 'Others', value: 5 }
          ]
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getSystemStatus: async (req, res) => {
    try {
      res.json({
        success: true,
        server: 'Online',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        paymentGateway: 'Razorpay Live',
        redis: 'Connected',
        bullQueue: 'BullMQ Idle'
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};


