import mongoose from 'mongoose';

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  productId: { type: String, required: true, index: true },
  warehouseId: { type: String, default: 'main' },
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

export const Inventory = mongoose.model('Inventory', inventorySchema);
