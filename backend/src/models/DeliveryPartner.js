import mongoose from 'mongoose';

// One row per delivery partner, keyed by the User that provides their login
// identity — same split as Customer ↔ User.
const deliveryPartnerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  phone: { type: String, index: true },
  vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'car', 'on_foot'], default: 'bike' },

  isOnline: { type: Boolean, default: false },
  availability: { type: String, enum: ['offline', 'available', 'busy'], default: 'offline', index: true },

  // GeoJSON point — [lng, lat]. No defaults: the path stays absent until the
  // first heartbeat sets BOTH type and coordinates (a partial {type:'Point'}
  // with no coordinates breaks the 2dsphere index).
  currentLocation: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }
  },
  locationUpdatedAt: { type: Date },

  zones: [{ type: String }],
  activeOrderIds: [{ type: String }], // Order.orderId of in-progress deliveries
  maxConcurrent: { type: Number, default: 1 },

  completedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  ratingCount: { type: Number, default: 0 },

  deviceTokens: [{ type: String }],
  lastSeenAt: { type: Date },
  onboardedAt: { type: Date, default: Date.now }
}, { timestamps: true });

deliveryPartnerSchema.index({ currentLocation: '2dsphere' }, { sparse: true });
deliveryPartnerSchema.index({ isOnline: 1, availability: 1 });

export const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
