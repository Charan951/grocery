import mongoose from 'mongoose';

// Address Sub-schema
const addressSchema = new mongoose.Schema({
  id: { type: String, default: () => 'addr_' + Date.now() },
  type: { type: String, enum: ['Home', 'Office', 'Other'], default: 'Home' },
  street: { type: String, required: true },
  city: { type: String, default: 'Bengaluru' },
  pincode: { type: String, required: true },
  lat: { type: Number, default: 12.9716 },
  lng: { type: Number, default: 77.5946 }
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true }, // e.g. cust_1234
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  membershipType: { type: String, enum: ['Normal', 'VIP'], default: 'Normal' },
  referralCode: { type: String, unique: true },
  referredBy: { type: String },
  walletBalance: { type: Number, default: 0 },
  addresses: [addressSchema]
}, { timestamps: true });

export const Customer = mongoose.model('Customer', customerSchema);
export const Address = mongoose.model('Address', addressSchema);
