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

export const uploadController = {
  uploadImage: async (req, res) => {
    try {
      const { image, folder } = req.body;
      if (!image) {
        return res.status(400).json({ success: false, message: 'No image data provided' });
      }
      try {
        const result = await uploadToCloudinary(image, folder || 'freshcart');
        return res.json({
          success: true,
          url: result.url,
          public_id: result.public_id
        });
      } catch (cloudErr) {
        console.warn('Cloudinary upload warning, returning local data URI fallback:', cloudErr.message);
        return res.json({
          success: true,
          url: image,
          public_id: 'local_fallback_' + Date.now(),
          fallback: true
        });
      }
    } catch (err) {
      console.error('Upload controller error:', err);
      res.status(500).json({ success: false, message: err.message || 'Image upload failed' });
    }
  }
};


