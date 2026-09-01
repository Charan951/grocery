import mongoose from 'mongoose';

// One row per completed delivery. Written idempotently on `complete` (upsert
// keyed by orderId), so a repeated completion call never double-pays.
const deliveryEarningSchema = new mongoose.Schema({
  partnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: String, required: true, unique: true, index: true },

  baseFee: { type: Number, default: 0 },       // Settings.deliveryBaseFee at time of delivery
  distanceKm: { type: Number, default: 0 },     // pickup → drop, haversine
  distanceFee: { type: Number, default: 0 },    // round(distanceKm * Settings.deliveryPerKmFee)
  tips: { type: Number, default: 0 },           // customer tip (no input surface yet — always 0)
  total: { type: Number, default: 0 },

  status: { type: String, enum: ['pending', 'settled'], default: 'pending', index: true },
  earnedAt: { type: Date, default: Date.now },
  settledAt: { type: Date },
}, { timestamps: true });

deliveryEarningSchema.index({ partnerUserId: 1, earnedAt: -1 });
deliveryEarningSchema.index({ partnerUserId: 1, status: 1 });

export const DeliveryEarning = mongoose.model('DeliveryEarning', deliveryEarningSchema);
