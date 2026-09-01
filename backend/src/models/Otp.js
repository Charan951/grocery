import mongoose from 'mongoose';

// One active OTP per phone number. Codes are stored hashed, expire via a TTL
// index, and lock out after too many wrong attempts.
const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true }, // 10-digit, digits only
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Mongo removes the document automatically once `expiresAt` passes.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model('Otp', otpSchema);
