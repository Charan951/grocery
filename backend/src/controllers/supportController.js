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

// 10. SUPPORT CONTROLLER
// ==========================================
export const supportController = {
  getTickets: async (req, res) => {
    try {
      const list = await SupportTicket.find().sort({ updatedAt: -1 });
      res.json({ success: true, tickets: list });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  addTicketMessage: async (req, res) => {
    try {
      const { sender, content, status } = req.body;
      const ticket = await SupportTicket.findOne({ ticketId: req.params.id });
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

      ticket.messages.push({ sender, content });
      if (status) ticket.status = status;

      await ticket.save();
      res.json({ success: true, ticket });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  createTicket: async (req, res) => {
    try {
      const { customerId, customerName, subject, priority, message } = req.body;
      const ticketId = 'TCK-' + Math.floor(1000 + Math.random() * 9000);
      const ticket = await SupportTicket.create({
        ticketId,
        customerId,
        customerName,
        subject,
        priority,
        messages: [{ sender: 'Customer', content: message }]
      });
      res.status(201).json({ success: true, ticket });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateTicketStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const ticket = await SupportTicket.findOneAndUpdate({ ticketId: req.params.id }, { status }, { new: true });
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
      res.json({ success: true, ticket });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};


