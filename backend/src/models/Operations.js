import mongoose from 'mongoose';

// Review Schema
const reviewSchema = new mongoose.Schema({
  productId: { type: String, required: true, index: true },
  customerId: { type: String, required: true },
  customerName: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  status: { type: String, enum: ['Approved', 'Pending', 'Rejected'], default: 'Pending', index: true }
}, { timestamps: true });

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // e.g. all or specific admin/user
  title: { type: String, required: true },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { type: String, default: 'Order' } // Order, Offer, Support, Security
}, { timestamps: true });

// CMS Page Schema
const cmsPageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  content: { type: String },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
  seoMetadata: {
    title: { type: String },
    description: { type: String },
    keywords: { type: String }
  }
}, { timestamps: true });

// Blog Schema
const blogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  excerpt: { type: String },
  content: { type: String },
  coverImage: { type: String },
  date: { type: String },
  author: {
    name: { type: String },
    role: { type: String },
    avatar: { type: String }
  },
  category: { type: String, default: 'Nutrition' },
  readTime: { type: String, default: '3 min read' }
}, { timestamps: true });

// Settings Schema
const settingsSchema = new mongoose.Schema({
  businessName: { type: String, default: 'FreshCart Enterprise' },
  supportEmail: { type: String, default: 'support@freshcart.com' },
  supportPhone: { type: String, default: '+91 80 4912 3456' },
  taxPercent: { type: Number, default: 5 }, // 5% GST standard on groceries
  deliveryFeeRule: { type: Number, default: 40 }, // Flat 40 Rs below 499
  gatewayKeys: {
    razorpayId: { type: String, default: 'mock_key_id' },
    razorpaySecret: { type: String, default: 'mock_key_secret' }
  },
  notificationsEnabled: { type: Boolean, default: true },
  // --- Delivery / dispatch config ---
  storeOrigin: {
    name: { type: String, default: 'FreshCart Dark Store' },
    lat: { type: Number, default: 17.4474 },
    lng: { type: Number, default: 78.3762 }
  },
  autoAssignEnabled: { type: Boolean, default: true }, // auto-offer on Order → Ready
  offerTimeoutSec: { type: Number, default: 25 },
  maxOfferAttempts: { type: Number, default: 5 },
  assignRadiusKm: { type: Number, default: 6 },
  batchRadiusKm: { type: Number, default: 1.5 }, // 2nd order only if its drop is within this of an active drop
  deliveryBaseFee: { type: Number, default: 20 },   // partner earning base (P2)
  deliveryPerKmFee: { type: Number, default: 6 },
  // --- Customer app runtime config (served by GET /api/app/config) ---
  appConfig: {
    minSupportedVersion: { type: String, default: '1.0.0' }, // app blocks below this
    latestVersion: { type: String, default: '1.0.0' },
    maintenance: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: 'FreshCart is briefly down for maintenance. Please try again shortly.',
    },
    updateUrl: { type: String, default: '' } // store listing link
  }
}, { timestamps: true });

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userName: { type: String },
  action: { type: String, required: true }, // e.g. "Product Created", "Order Approved"
  details: { type: String },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// Support Ticket Schema
const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String },
  subject: { type: String, required: true },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open', index: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  messages: [{
    sender: { type: String }, // e.g. "Customer", "Agent"
    content: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export const Review = mongoose.model('Review', reviewSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const CMSPage = mongoose.model('CMSPage', cmsPageSchema);
export const Blog = mongoose.model('Blog', blogSchema);
export const Settings = mongoose.model('Settings', settingsSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
