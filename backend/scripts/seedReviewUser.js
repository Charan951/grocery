// One-off: ensure the Play Store review account exists and is up to date (same
// data as seed.js), without running the full seed (which can reseed catalog
// outside production).
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';

const email = 'verification@gmail.com';
const name = 'Reviewer';
const phone = '9000000000';
const password = 'verify@123';
// Mobile app logs in via /customers/login-email → Customer.passwordHash, and
// register stores phone as '+91 XXXXXXXXXX' with customerId 'cust_<phone>'.
const customerFields = { name, phone: `+91 ${phone}`, passwordHash: await bcrypt.hash(password, 10) };

await mongoose.connect(process.env.MONGO_URI);
let user = await User.findOne({ email });
if (!user) {
  user = await User.create({ name, email, phone, password, role: 'Customer', status: 'Active' });
  console.log('Created user');
} else {
  await User.updateOne({ _id: user._id }, { $set: { name, phone } });
  console.log('Updated user');
}
const customer = await Customer.findOne({ email });
if (!customer) {
  await Customer.create({ customerId: 'cust_' + phone, email, referralCode: 'PLAYREVIEW', addresses: [], ...customerFields });
  console.log('Created customer profile');
} else {
  await Customer.updateOne({ _id: customer._id }, { $set: { customerId: 'cust_' + phone, ...customerFields } });
  console.log('Updated customer profile');
}
await mongoose.disconnect();
