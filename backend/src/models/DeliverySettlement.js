import mongoose from 'mongoose';

const deliverySettlementSchema = new mongoose.Schema({
  settlementId: { type: String, required: true, unique: true, index: true },
  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  amount: { type: Number, required: true, min: 0 },
  earningIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryEarning' }],
  orderIds: [{ type: String }],
  orderCount: { type: Number, default: 0 },

  // Payout lifecycle is independent of earning status: a settlement can fail
  // and be retried without ever having marked the underlying earnings SETTLED.
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'], default: 'PENDING', index: true },
  paymentReference: { type: String },
  failureReason: { type: String },
  processedAt: { type: Date },

  settledAt: { type: Date, default: Date.now },
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

deliverySettlementSchema.index({ deliveryPartnerId: 1, settledAt: -1 });

export const DeliverySettlement = mongoose.model('DeliverySettlement', deliverySettlementSchema);
