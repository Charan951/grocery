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

// Bank account / UPI ID the customer wants return refunds paid to. The whole
// array is `select: false` on the customer so it never leaks through the
// profile endpoints — read it explicitly and expose it via maskRefundAccount().
const refundAccountSchema = new mongoose.Schema({
  id: { type: String, default: () => 'rfa_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) },
  type: { type: String, enum: ['bank', 'upi'], required: true },
  holderName: { type: String, default: '' },
  accountNumber: { type: String },   // bank only
  ifsc: { type: String },            // bank only
  upiId: { type: String },           // upi only
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

// Customer Schema
const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true }, // e.g. cust_1234
  name: { type: String, default: 'Customer' },
  email: { type: String, default: '', index: true },
  passwordHash: { type: String, default: null, select: false }, // set only for email/password accounts
  phone: { type: String, required: true, unique: true, index: true },
  membershipType: { type: String, enum: ['Normal', 'VIP'], default: 'Normal' },
  referralCode: { type: String },
  referredBy: { type: String },
  walletBalance: { type: Number, default: 0 },
  addresses: [addressSchema],
  refundAccounts: { type: [refundAccountSchema], select: false, default: [] },
}, { timestamps: true });

/** Customer-safe projection of a saved (or snapshotted) refund account. */
export const maskRefundAccount = (a) => {
  if (!a) return null;
  const o = typeof a.toObject === 'function' ? a.toObject() : a;
  const last4 = String(o.accountNumber || '').slice(-4);
  return {
    id: o.id,
    type: o.type,
    holderName: o.holderName,
    isDefault: !!o.isDefault,
    ...(o.type === 'bank'
      ? { ifsc: o.ifsc, accountLast4: last4, label: `A/c ••••${last4} · ${o.ifsc}` }
      : { upiId: o.upiId, label: `UPI · ${o.upiId}` }),
  };
};

export const Customer = mongoose.model('Customer', customerSchema);
export const Address = mongoose.model('Address', addressSchema);
