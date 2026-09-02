import mongoose from 'mongoose';

// A delivery service area. `polygon` is a GeoJSON Polygon ([[[lng,lat],...]],
// first ring, closed). Used to (a) scope auto-assignment to partners tagged for
// the zone the pickup falls in, and (b) carry a per-zone delivery SLA.
const deliveryZoneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  polygon: {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], required: true }, // [ [ [lng,lat], ... ] ]
  },
  slaMinutes: { type: Number, default: 15 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

deliveryZoneSchema.index({ polygon: '2dsphere' });

export const DeliveryZone = mongoose.model('DeliveryZone', deliveryZoneSchema);
