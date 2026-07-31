import mongoose from 'mongoose';

// Warehouse Schema
const warehouseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String },
  capacity: { type: Number, default: 10000 },
  zone: { type: String, default: 'South' },
  coordinates: {
    lat: { type: Number, default: 12.9716 },
    lng: { type: Number, default: 77.5946 }
  },
  pincodes: [{ type: String }] // Covered areas
}, { timestamps: true });

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  productId: { type: String, required: true, index: true },
  warehouseId: { type: String, required: true, index: true },
  stockQty: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  batchNumber: { type: String, default: 'B-MAIN-01' },
  expiryDate: { type: Date },
  logs: [{
    action: { type: String, enum: ['Adjustment', 'Transfer', 'Sale', 'Restock'], default: 'Restock' },
    qty: { type: Number },
    prevQty: { type: Number },
    newQty: { type: Number },
    note: { type: String },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export const Inventory = mongoose.model('Inventory', inventorySchema);
