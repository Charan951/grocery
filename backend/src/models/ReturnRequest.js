import mongoose from 'mongoose';

// Customer-initiated return / exchange for a Delivered order.
//
// Lifecycle (status):
//   Requested  → waiting for a pickup partner (offers broadcast to nearby partners)
//   Assigned   → a partner accepted the pickup
//   Arrived    → partner is at the customer's door
//   Picked Up  → partner collected the item(s) with proof (photo + customer OTP).
//                Return: refund is scheduled for refund.dueAt (24h after pickup).
//                Exchange: the replacement was handed over at the same visit.
//   Completed  → partner dropped the collected item(s) back at the store
//   Rejected   → ops declined the request, or the partner refused at the door
//                (item mismatch / not in returnable condition)
//   Pickup Failed → partner could not collect (customer unavailable) — ops can requeue
//   Cancelled  → customer withdrew before pickup
//
// Pickup offers are embedded (not Assignment rows) so they never collide with
// the order-dispatch pipeline; accept is still atomic via a single
// findOneAndUpdate guarded on `partnerUserId: null`.
const returnItemSchema = new mongoose.Schema({
  productId: { type: String },
  name: { type: String, required: true },
  image: { type: String },
  weightSpec: { type: String },
  price: { type: Number, required: true },   // unit price paid
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const offerSchema = new mongoose.Schema({
  partnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  partnerName: { type: String },
  status: { type: String, enum: ['offered', 'accepted', 'rejected', 'expired', 'cancelled'], default: 'offered' },
  attempt: { type: Number, default: 1 },
  distanceMeters: { type: Number },
  offeredAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  respondedAt: { type: Date },
  source: { type: String, enum: ['auto', 'manual'], default: 'auto' },
}, { _id: true });

const returnRequestSchema = new mongoose.Schema({
  returnId: { type: String, required: true, unique: true, index: true }, // RT-XXXXXX
  orderId: { type: String, required: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String },
  customerPhone: { type: String, index: true },

  type: { type: String, enum: ['return', 'exchange'], required: true },
  items: { type: [returnItemSchema], validate: (v) => Array.isArray(v) && v.length > 0 },
  reasonCode: { type: String, required: true },
  reasonLabel: { type: String },
  comment: { type: String, maxlength: 500 },
  photos: [{ type: String }], // customer's evidence photos

  status: {
    type: String,
    enum: ['Requested', 'Assigned', 'Arrived', 'Picked Up', 'Completed', 'Rejected', 'Pickup Failed', 'Cancelled'],
    default: 'Requested',
    index: true,
  },

  // Where the partner goes. Return: customer → store. Exchange: store
  // (collect replacement) → customer → store.
  pickupAddress: { type: String },
  pickupLocation: { lat: { type: Number }, lng: { type: Number } },
  store: { name: { type: String }, lat: { type: Number }, lng: { type: Number } },

  // Dispatch
  partnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  partnerName: { type: String },
  offers: [offerSchema],
  dispatchStalled: { type: Boolean, default: false },

  // Proof of pickup
  pickupOtp: { type: String },            // shown to the customer, entered by the partner
  otpAttempts: { type: Number, default: 0 },
  proofPhotos: [{ type: String }],        // partner's photos at collection
  proofNote: { type: String },
  assignedAt: { type: Date },
  arrivedAt: { type: Date },
  pickedUpAt: { type: Date },
  completedAt: { type: Date },

  rejectionReason: { type: String },
  failureReason: { type: String },

  // Refund (return only). Scheduled at pickup, paid by the refund sweeper once
  // dueAt passes — or immediately by an admin "refund now".
  refund: {
    amount: { type: Number, default: 0 },
    method: { type: String, enum: ['wallet', 'original'], default: 'wallet' },
    status: { type: String, enum: ['none', 'scheduled', 'processing', 'processed', 'failed'], default: 'none' },
    dueAt: { type: Date },
    processedAt: { type: Date },
    reference: { type: String },
    failureReason: { type: String },
  },

  timeline: [{
    status: { type: String },
    note: { type: String },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

returnRequestSchema.index({ status: 1, 'offers.status': 1 });
returnRequestSchema.index({ 'refund.status': 1, 'refund.dueAt': 1 });

export const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);
