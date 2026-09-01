import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Customer } from '../models/Customer.js';
import { Otp } from '../models/Otp.js';
import { sendSms, OTP_TEST_MODE } from '../services/smsService.js';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const FIXED_TEST_CODE = '000000';

const normalizePhone = (raw) => String(raw || '').replace(/\D/g, '').slice(-10);

const signCustomerToken = (customerId) =>
  jwt.sign({ id: customerId, type: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });

const findOrCreateCustomer = async (phone10) => {
  const formattedPhone = `+91 ${phone10}`;
  let customer = await Customer.findOne({
    $or: [
      { phone: formattedPhone },
      { phone: phone10 },
      { phone: new RegExp(phone10 + '$') }
    ]
  });
  if (!customer) {
    customer = await Customer.create({
      customerId: 'cust_' + phone10,
      phone: formattedPhone,
      name: `Customer (${phone10.slice(-4)})`,
      email: '',
      // The DB has a legacy unique index on referralCode — always set one so two
      // new customers don't collide on `null`.
      referralCode: 'REF_' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      addresses: []
    });
  }
  return customer;
};

export const customerAuthController = {
  // POST /api/customers/otp/send  { phone }
  sendOtp: async (req, res) => {
    try {
      const phone = normalizePhone(req.body.phone);
      if (phone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Enter a valid 10-digit phone number' });
      }

      const code = OTP_TEST_MODE
        ? FIXED_TEST_CODE
        : String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await bcrypt.hash(code, 8);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      await Otp.findOneAndUpdate(
        { phone },
        { codeHash, expiresAt, attempts: 0 },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await sendSms(`+91${phone}`, `${code} is your FreshCart verification code. Valid for 5 minutes.`);

      return res.json({
        success: true,
        requestId: phone,
        ttl: OTP_TTL_MS / 1000,
        testMode: OTP_TEST_MODE,
        ...(OTP_TEST_MODE ? { devCode: code } : {})
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // POST /api/customers/otp/verify  { phone, code }
  verifyOtp: async (req, res) => {
    try {
      const phone = normalizePhone(req.body.phone);
      const code = String(req.body.code || '').trim();
      if (phone.length !== 10 || !code) {
        return res.status(400).json({ success: false, message: 'Phone and code are required' });
      }

      const record = await Otp.findOne({ phone });
      if (!record) {
        return res.status(400).json({ success: false, message: 'No verification code found. Request a new one.' });
      }
      if (record.expiresAt.getTime() < Date.now()) {
        await Otp.deleteOne({ _id: record._id });
        return res.status(400).json({ success: false, message: 'Code expired. Request a new one.' });
      }
      if (record.attempts >= MAX_ATTEMPTS) {
        await Otp.deleteOne({ _id: record._id });
        return res.status(429).json({ success: false, message: 'Too many attempts. Request a new code.' });
      }

      const ok = await bcrypt.compare(code, record.codeHash);
      if (!ok) {
        record.attempts += 1;
        await record.save();
        const left = Math.max(0, MAX_ATTEMPTS - record.attempts);
        return res.status(400).json({ success: false, message: `Incorrect code. ${left} attempt(s) left.` });
      }

      await Otp.deleteOne({ _id: record._id });

      const customer = await findOrCreateCustomer(phone);
      const token = signCustomerToken(customer.customerId);
      return res.json({ success: true, token, customer });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /api/customers/me  (protectCustomer)
  getMe: async (req, res) => {
    res.json({ success: true, customer: req.customer });
  }
};
