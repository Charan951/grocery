// Shared helpers for the split API controllers (extracted from apiController.js).
import Razorpay from 'razorpay';
import jwt from 'jsonwebtoken';
import { AuditLog } from '../models/Operations.js';

// Credentials come from the environment only — no hardcoded key fallbacks in source.
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Evaluated per-call (not at import) so tests can toggle the env var.
// Test mode = explicitly forced, or no real key configured (missing / "mock_*").
export const isPaymentsTestMode = () =>
  process.env.PAYMENTS_TEST_MODE === 'true' ||
  !process.env.RAZORPAY_KEY_SECRET ||
  (process.env.RAZORPAY_KEY_ID || '').startsWith('mock');

export const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

// Helper to sign JWT
export const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

// "+91 9876543210" -> "98••••10"; keeps first 2 + last 2 of the 10-digit number.
export const maskPhone = (raw) => {
  const d = String(raw || '').replace(/\D/g, '').slice(-10);
  if (d.length < 6) return d ? '••' : '';
  return `${d.slice(0, 2)}••••${d.slice(-2)}`;
};

export const logAudit = async (userId, userName, action, details) => {
  try {
    await AuditLog.create({ userId, userName, action, details });
  } catch (err) {
    console.error('Audit logging failed:', err.message);
  }
};
