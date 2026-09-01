import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Role Schema
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  permissions: [{ type: String }] // e.g. ["read:products", "write:products"]
}, { timestamps: true });

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, default: 'Customer', index: true }, // e.g. Admin, Manager, Employee, Delivery, Customer
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  avatarUrl: { type: String, default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop' },
  // Password-reset (delivery partner / staff self-service). Code is hashed.
  resetCodeHash: { type: String },
  resetCodeExpires: { type: Date }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
export const Role = mongoose.model('Role', roleSchema);
