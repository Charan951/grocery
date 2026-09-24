import mongoose from 'mongoose';

// One row per completed delivery. Written idempotently on `complete` (upsert
// keyed by orderId), so a repeated completion call never double-pays.
const deliveryEarningSchema = new mongoose.Schema({
  partnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orderId: { type: String, required: true, unique: true, index: true },

  baseFee: { type: Number, default: 0 },       // Settings.deliveryBaseFee at time of delivery
  distanceKm: { type: Number, default: 0 },     // pickup → drop, haversine
  distanceFee: { type: Number, default: 0 },    // round(distanceKm * Settings.deliveryPerKmFee)
  bonus: { type: Number, default: 0 },          // incentive / bonus pay
  tips: { type: Number, default: 0 },           // customer tip (no input surface yet — always 0)
  total: { type: Number, default: 0 },

  // pending: just earned, not yet eligible for settlement.
  // eligible: available for admin to include in a settlement.
  // settled: payout for the settlement containing this earning succeeded.
  status: { type: String, enum: ['pending', 'eligible', 'settled'], default: 'pending', index: true },
  earnedAt: { type: Date, default: Date.now },
  eligibleAt: { type: Date },
  settledAt: { type: Date },
  settlementId: { type: String, index: true },
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

deliveryEarningSchema.index({ partnerUserId: 1, earnedAt: -1 });
deliveryEarningSchema.index({ partnerUserId: 1, status: 1 });

export const DeliveryEarning = mongoose.model('DeliveryEarning', deliveryEarningSchema);
