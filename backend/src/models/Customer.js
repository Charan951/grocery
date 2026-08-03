import mongoose from 'mongoose';

// Address Sub-schema matching image copy 2.png & image copy 3.png
const addressSchema = new mongoose.Schema({
  id: { type: String, default: () => 'addr_' + Date.now() },
  name: { type: String, default: '' },
  receiverPhone: { type: String, default: '' },
  label: { type: String, enum: ['Home', 'Work', 'Office', 'Other'], default: 'Home' },
  houseNo: { type: String, default: '' },
  landmark: { type: String, default: '' },
  area: { type: String, default: 'KPHB Colony' },
  fullAddress: { type: String, required: true },
  city: { type: String, default: 'Hyderabad' },
  pincode: { type: String, default: '500072' },
  lat: { type: Number, default: 17.4842 },
  lng: { type: Number, default: 78.3888 },
  isDefault: { type: Boolean, default: false }
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true }, // e.g. cust_1234
  name: { type: String, default: 'Customer' },
  email: { type: String, default: '' },
  phone: { type: String, required: true, unique: true, index: true },
  membershipType: { type: String, enum: ['Normal', 'VIP'], default: 'Normal' },
  referralCode: { type: String },
  referredBy: { type: String },
  walletBalance: { type: Number, default: 0 },
  addresses: [addressSchema]
}, { timestamps: true });

export const Customer = mongoose.model('Customer', customerSchema);
export const Address = mongoose.model('Address', addressSchema);
