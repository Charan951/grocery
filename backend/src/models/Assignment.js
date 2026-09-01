import mongoose from 'mongoose';

// One row per offer attempt. History rows share `orderId`, so uniqueness of the
// "live" offer/accepted state is enforced atomically in code, not by an index.
const assignmentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, index: true },      // Order.orderId
  partnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  partnerName: { type: String },
  status: {
    type: String,
    enum: ['offered', 'accepted', 'rejected', 'expired', 'cancelled', 'completed', 'failed'],
    default: 'offered',
    index: true
  },
  attempt: { type: Number, default: 1 },
  distanceMeters: { type: Number },
  offeredAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
  expiresAt: { type: Date },   // TTL index purges very old rows; the sweeper does the functional expiry
  reason: { type: String },
  source: { type: String, enum: ['auto', 'manual', 'manual_force'], default: 'manual' }
}, { timestamps: true });

// Housekeeping only — deletes rows 1h past expiry. Business expiry is the sweeper.
assignmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const Assignment = mongoose.model('Assignment', assignmentSchema);
