// One-off: ensure the Play Store review account exists (same logic as seed.js),
// without running the full seed (which can reseed catalog outside production).
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';

const email = 'verification@gmail.com';
await mongoose.connect(process.env.MONGO_URI);
let user = await User.findOne({ email });
if (!user) {
  user = await User.create({ name: 'Verification User', email, password: 'verify@123', role: 'Customer', status: 'Active' });
  console.log('Created user');
} else console.log('User exists, role:', user.role, 'status:', user.status);
if (!(await Customer.findOne({ email }))) {
  await Customer.create({ customerId: 'cust_' + user._id.toString().slice(-6), name: user.name, email, phone: '9000000001', referralCode: 'PLAYREVIEW', addresses: [] });
  console.log('Created customer profile');
} else console.log('Customer profile exists');
await mongoose.disconnect();
