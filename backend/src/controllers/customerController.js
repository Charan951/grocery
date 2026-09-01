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

// 9. CUSTOMERS CONTROLLER
// ==========================================
export const customerController = {
  getCustomers: async (req, res) => {
    try {
      const list = await Customer.find().sort({ createdAt: -1 });
      res.json({ success: true, customers: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  authCustomer: async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const formattedPhone = `+91 ${cleanPhone}`;

      let customer = await Customer.findOne({
        $or: [
          { phone: formattedPhone },
          { phone: phone },
          { phone: new RegExp(cleanPhone + '$') }
        ]
      });

      if (!customer) {
        const customerId = 'cust_' + cleanPhone;
        customer = await Customer.create({
          customerId,
          phone: formattedPhone,
          name: `Customer (${cleanPhone.slice(-4)})`,
          email: '',
          addresses: [
            {
              id: 'addr_' + Date.now(),
              label: 'Home',
              houseNo: 'Flat 402, Balaji Heights',
              landmark: 'Near Balaji Temple',
              area: 'KPHB Phase 3',
              fullAddress: 'Flat 402, Balaji Heights, KPHB Phase 3, Kukatpally, Hyderabad, Telangana 500072, India',
              city: 'Hyderabad',
              pincode: '500072',
              lat: 17.4842,
              lng: 78.3888,
              isDefault: true
            }
          ]
        });
      }

      res.json({ success: true, customer });
    } catch (err) {
      console.warn('authCustomer DB error, returning phone fallback object:', err.message);
      const cleanPhone = (req.body.phone || '9876543210').replace(/\D/g, '').slice(-10);
      res.json({
        success: true,
        customer: {
          customerId: 'cust_' + cleanPhone,
          phone: `+91 ${cleanPhone}`,
          name: `Customer (${cleanPhone.slice(-4)})`,
          email: '',
          addresses: []
        }
      });
    }
  },

  getCustomerProfile: async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id);
      const cleanPhone = id.replace(/\D/g, '').slice(-10);
      const query = {
        $or: [
          { customerId: id },
          { phone: id },
          ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
        ]
      };
      const customer = await Customer.findOne(query);
      if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });
      res.json({ success: true, customer });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id);
      const cleanPhone = id.replace(/\D/g, '').slice(-10);
      const { name, email } = req.body;

      const query = {
        $or: [
          { customerId: id },
          { phone: id },
          ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
        ]
      };

      let customer = await Customer.findOneAndUpdate(
        query,
        { $set: { name, email } },
        { new: true, upsert: true }
      );

      if (!customer.phone) {
        customer.phone = id;
        customer.customerId = 'cust_' + Date.now();
        await customer.save();
      }

      res.json({ success: true, customer });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  addAddress: async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id);
      const cleanPhone = id.replace(/\D/g, '').slice(-10);
      const { name, receiverPhone, label, houseNo, landmark, area, fullAddress, pincode, lat, lng } = req.body;

      const query = {
        $or: [
          { customerId: id },
          { phone: id },
          ...(cleanPhone ? [{ phone: new RegExp(cleanPhone + '$') }] : [])
        ]
      };

      let customer = await Customer.findOne(query);
      if (!customer) {
        customer = await Customer.create({
          customerId: 'cust_' + (cleanPhone || Date.now()),
          phone: `+91 ${cleanPhone}`,
          name: name || `Customer (${cleanPhone.slice(-4)})`,
          addresses: []
        });
      }

      const newAddress = {
        id: 'addr_' + Date.now(),
        name: name || customer.name || '',
        receiverPhone: receiverPhone || customer.phone || '',
        label: label || 'Home',
        houseNo: houseNo || '',
        landmark: landmark || '',
        area: area || 'KPHB Colony',
        fullAddress: fullAddress || `${houseNo ? houseNo + ', ' : ''}${landmark ? landmark + ', ' : ''}${area || 'KPHB Colony'}`,
        pincode: pincode || '500072',
        lat: lat || 17.4842,
        lng: lng || 78.3888,
        isDefault: customer.addresses ? customer.addresses.length === 0 : true
      };

      if (!customer.addresses) customer.addresses = [];
      customer.addresses.push(newAddress);
      if (name && (!customer.name || customer.name.startsWith('Customer'))) {
        customer.name = name;
      }
      await customer.save();

      res.json({ success: true, addresses: customer.addresses, newAddress });
    } catch (err) {
      console.warn('addAddress DB fallback note:', err.message);
      const newAddress = {
        id: 'addr_' + Date.now(),
        name: req.body.name || 'Customer',
        receiverPhone: req.body.receiverPhone || '',
        label: req.body.label || 'Home',
        houseNo: req.body.houseNo || '',
        landmark: req.body.landmark || '',
        area: req.body.area || 'KPHB Colony',
        fullAddress: req.body.fullAddress || 'Selected Delivery Address',
        pincode: req.body.pincode || '500072',
        lat: req.body.lat || 17.4842,
        lng: req.body.lng || 78.3888,
        isDefault: true
      };
      res.json({ success: true, addresses: [newAddress], newAddress });
    }
  },

  deleteAddress: async (req, res) => {
    try {
      const { id, addressId } = req.params;
      const customer = await Customer.findOne({ $or: [{ customerId: id }, { phone: id }] });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

      customer.addresses = customer.addresses.filter(a => a.id !== addressId);
      await customer.save();

      res.json({ success: true, addresses: customer.addresses });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/customers/:id  (staff only) — admin removal of a customer record.
  deleteAccount: async (req, res) => {
    try {
      const customer = await Customer.findOneAndDelete({ $or: [{ customerId: req.params.id }, { phone: req.params.id }] });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/customers/me  (attachCustomerOptional — app token OR ?phone= for
  // the token-less web storefront). Customer self-service account deletion:
  // removes the profile + wallet ledger + their reviews, and scrubs the name
  // from past orders (kept as financial/delivery records).
  deleteMe: async (req, res) => {
    try {
      let customer = req.customer;
      if (!customer) {
        const raw = String(req.query.phone || req.body.phone || '').replace(/\D/g, '').slice(-10);
        if (raw) customer = await Customer.findOne({ phone: new RegExp(raw + '$') });
      }
      if (!customer) {
        return res.status(401).json({ success: false, message: 'Sign in to delete your account' });
      }

      const cid = customer.customerId;
      const phone10 = String(customer.phone || '').replace(/\D/g, '').slice(-10);

      await Promise.allSettled([
        Customer.deleteOne({ customerId: cid }),
        Review.deleteMany({ customerId: cid }),
        WalletTransaction.deleteMany({ customerId: cid }),
        Order.updateMany(
          {
            $or: [
              { customerId: cid },
              ...(phone10 ? [{ customerPhone: new RegExp(phone10 + '$') }] : []),
            ],
          },
          { $set: { customerName: 'Deleted user' } },
        ),
      ]);

      res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateWallet: async (req, res) => {
    try {
      const { amount, type, description } = req.body; // type: Credit / Debit
      const customer = await Customer.findOne({ customerId: req.params.id });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer profile not found' });

      const numVal = Number(amount);
      if (type === 'Credit') {
        customer.walletBalance += numVal;
      } else {
        customer.walletBalance = Math.max(0, customer.walletBalance - numVal);
      }

      await customer.save();
      await WalletTransaction.create({ customerId: customer.customerId, amount: numVal, type, description });

      res.json({ success: true, walletBalance: customer.walletBalance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/customers/me/wallet/debit  { amount, orderId }  (protectCustomer)
  // Server-side wallet payment for checkout. Rejects if the balance is short.
  walletDebit: async (req, res) => {
    try {
      const customer = req.customer;
      const val = Number(req.body.amount);
      if (!val || val <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }
      if ((customer.walletBalance || 0) < val) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
      customer.walletBalance -= val;
      await customer.save();
      await WalletTransaction.create({
        customerId: customer.customerId,
        amount: val,
        type: 'Debit',
        description: req.body.orderId ? `Payment for order ${req.body.orderId}` : 'Order payment',
      });
      res.json({ success: true, walletBalance: customer.walletBalance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/customers/me/wallet/topup  { amount }  (protectCustomer)
  // Step 1: create a Razorpay order for a wallet top-up. Nothing is credited yet.
  walletTopup: async (req, res) => {
    try {
      const val = Math.round(Number(req.body.amount));
      if (!val || val < 1 || val > 100000) {
        return res.status(400).json({ success: false, message: 'Enter an amount between ₹1 and ₹1,00,000' });
      }
      const receipt = `wallet_${req.customer.customerId}_${Date.now()}`.slice(0, 40);
      try {
        const order = await razorpayInstance.orders.create({ amount: val * 100, currency: 'INR', receipt });
        return res.json({
          success: true, testMode: isPaymentsTestMode(),
          orderId: order.id, amount: order.amount, currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID || '',
        });
      } catch (err) {
        if (isPaymentsTestMode()) {
          return res.json({
            success: true, testMode: true,
            orderId: `order_test_${Date.now()}`, amount: val * 100, currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID || '',
          });
        }
        throw err;
      }
    } catch (err) {
      res.status(502).json({ success: false, message: 'Could not start the top-up. Try again.' });
    }
  },

  // POST /api/customers/me/wallet/topup/verify
  //   { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }
  // Step 2: verify the payment, then credit the wallet + write a ledger row.
  walletTopupVerify: async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const val = Math.round(Number(req.body.amount));
      if (!val || val < 1) return res.status(400).json({ success: false, message: 'Invalid amount' });

      if (!isPaymentsTestMode()) {
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return res.status(400).json({ success: false, message: 'Missing Razorpay verification fields' });
        }
        const expected = crypto
          .createHmac('sha256', RAZORPAY_KEY_SECRET)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');
        const a = Buffer.from(expected, 'utf8');
        const b = Buffer.from(String(razorpay_signature), 'utf8');
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return res.status(400).json({ success: false, verified: false, message: 'Signature verification failed' });
        }
      }

      const customer = req.customer;
      customer.walletBalance = (customer.walletBalance || 0) + val;
      await customer.save();
      await WalletTransaction.create({
        customerId: customer.customerId,
        amount: val,
        type: 'Credit',
        description: `Wallet top-up${razorpay_payment_id ? ` (${razorpay_payment_id})` : ''}`,
      });
      res.json({ success: true, verified: true, walletBalance: customer.walletBalance });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/customers/me/wallet/transactions?limit=  (protectCustomer)
  // The signed-in customer's own wallet ledger, newest first.
  walletTransactions: async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const list = await WalletTransaction.find({ customerId: req.customer.customerId })
        .sort({ date: -1 })
        .limit(limit);
      res.json({
        success: true,
        walletBalance: req.customer.walletBalance || 0,
        transactions: list,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/customers/me/devices  { token, platform }
  registerDevice: async (req, res) => {
    try {
      const { token, platform } = req.body || {};
      if (!token) return res.status(400).json({ success: false, message: 'token required' });
      await registerDeviceToken({ ownerType: 'customer', ownerId: req.customer.customerId, token, platform });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // DELETE /api/customers/me/devices/:token
  removeDevice: async (req, res) => {
    try {
      await removeDeviceToken(req.params.token);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

// ==========================================

