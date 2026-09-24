import mongoose from 'mongoose';

// A customer tip for a completed delivery. One row per order — enforced by
// the unique index — so a tip can never be counted twice toward earnings.
const tipSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  paymentId: { type: String },
  status: { type: String, enum: ['pending', 'paid'], default: 'paid', index: true },
}, { timestamps: true });

export const Tip = mongoose.model('Tip', tipSchema);
