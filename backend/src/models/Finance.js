import mongoose from 'mongoose';

// Coupon Schema
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  discount: { type: String, required: true }, // e.g. "₹50 OFF", "10% OFF"
  description: { type: String },
  minOrder: { type: Number, default: 0 },
  value: { type: Number, required: true }, // raw discount amount
  isPercent: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Offer Schema
const offerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  subtitle: { type: String },
  tag: { type: String }, // e.g. "FLASH SALE"
  gradient: [{ type: String }], // e.g. ["#4CAF50", "#81C784"]
  active: { type: Boolean, default: true },
  type: { type: String, default: 'banner' } // banner, card
}, { timestamps: true });

// Payment & Transaction Schema
const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, index: true },
  customerId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Success', 'Pending', 'Failed'], default: 'Pending' },
  gateway: { type: String, default: 'Razorpay' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// Wallet Transaction Schema
const walletTransactionSchema = new mongoose.Schema({
  customerId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['Credit', 'Debit'], required: true },
  description: { type: String },
  date: { type: Date, default: Date.now }
});

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, index: true },
  date: { type: Date, default: Date.now },
  pdfUrl: { type: String }
}, { timestamps: true });

export const Coupon = mongoose.model('Coupon', couponSchema);
export const Offer = mongoose.model('Offer', offerSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
export const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
