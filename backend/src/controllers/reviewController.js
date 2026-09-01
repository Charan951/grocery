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

async function recomputeProductRating(productId) {
  if (!productId) return;
  const approved = await Review.find({ productId, status: 'Approved' });
  if (!approved.length) return;
  const avg = approved.reduce((s, r) => s + r.rating, 0) / approved.length;
  await Product.updateOne(
    { id: productId },
    { $set: { rating: Math.round(avg * 10) / 10, reviewsCount: approved.length } },
  ).catch(() => {});
}

export const reviewController = {
  getReviews: async (req, res) => {
    try {
      const list = await Review.find().sort({ createdAt: -1 });
      res.json({ success: true, reviews: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/products/:id/reviews  (public) — Approved reviews + a rating summary.
  getProductReviews: async (req, res) => {
    try {
      const productId = req.params.id;
      const list = await Review.find({ productId, status: 'Approved' }).sort({ createdAt: -1 });
      const count = list.length;
      const average = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
      const distribution = [0, 0, 0, 0, 0]; // index 0 => 1 star
      for (const r of list) {
        if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1] += 1;
      }
      res.json({
        success: true,
        summary: { average: Math.round(average * 10) / 10, count, distribution },
        reviews: list,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/products/:id/reviews  { rating, comment, phone? }  (attachCustomerOptional)
  // Identity from the app's customer token, or from a { phone } in the body for
  // the token-less web storefront. Only a customer who has received this product
  // in a Delivered order may review it, one review per product (a repeat call
  // edits the existing one). New/edited reviews enter moderation as 'Pending'.
  createProductReview: async (req, res) => {
    try {
      const productId = req.params.id;
      const rating = Number(req.body.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      const product = await Product.findOne({ id: productId });
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      let cust = req.customer;
      if (!cust) {
        const raw = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
        if (raw) cust = await Customer.findOne({ phone: new RegExp(raw + '$') });
      }
      if (!cust) {
        return res.status(401).json({ success: false, message: 'Sign in to write a review' });
      }
      const phone10 = String(cust.phone || '').replace(/\D/g, '').slice(-10);
      const delivered = await Order.findOne({
        status: 'Delivered',
        'items.productId': productId,
        $or: [
          { customerId: cust.customerId },
          ...(phone10 ? [{ customerPhone: new RegExp(phone10 + '$') }] : []),
        ],
      });
      if (!delivered) {
        return res.status(403).json({
          success: false,
          message: 'You can review this only after receiving it in an order',
        });
      }

      const comment = String(req.body.comment || '').trim().slice(0, 1000);
      const existing = await Review.findOne({ productId, customerId: cust.customerId });
      if (existing) {
        existing.rating = rating;
        existing.comment = comment;
        existing.customerName = cust.name || existing.customerName || 'Customer';
        existing.status = 'Pending';
        await existing.save();
        return res.json({ success: true, review: existing, updated: true });
      }
      const review = await Review.create({
        productId,
        customerId: cust.customerId,
        customerName: cust.name || 'Customer',
        rating,
        comment,
        status: 'Pending',
      });
      res.status(201).json({ success: true, review });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateReviewStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
      recomputeProductRating(review.productId);
      res.json({ success: true, review });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
  deleteReview: async (req, res) => {
    try {
      const review = await Review.findByIdAndDelete(req.params.id);
      if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
      recomputeProductRating(review.productId);
      res.json({ success: true, message: 'Review deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // PUT /api/reviews/bulk-status  { ids: [], status: 'Approved' | 'Rejected' | 'Pending' }
  bulkUpdateReviewStatus: async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || !ids.length || !['Approved', 'Rejected', 'Pending'].includes(status)) {
        return res.status(400).json({ success: false, message: 'ids[] and a valid status are required' });
      }
      const affected = await Review.find({ _id: { $in: ids } }).select('productId').lean();
      const r = await Review.updateMany({ _id: { $in: ids } }, { $set: { status } });
      [...new Set(affected.map((a) => a.productId))].forEach(recomputeProductRating);
      res.json({ success: true, updated: r.modifiedCount ?? r.nModified ?? 0 });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};


