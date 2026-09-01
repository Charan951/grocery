import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';

import { createApp } from '../app.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Order } from '../src/models/Order.js';
import { Coupon } from '../src/models/Finance.js';
import { Otp } from '../src/models/Otp.js';

dotenv.config();

const { app } = createApp({ logRequests: false });
const api = () => request(app);

// Unique fixtures so runs don't collide and cleanup is targeted.
const stamp = Date.now().toString().slice(-7);
const PHONE_A = `90000${stamp.slice(-5)}`;
const PHONE_B = `91111${stamp.slice(-5)}`;
const COUPON = `TEST${stamp}`;
const ADMIN_EMAIL = `qa+${stamp}@freshcart.test`;

test.before(async () => {
  process.env.PAYMENTS_TEST_MODE = 'true';
  process.env.OTP_TEST_MODE = 'true';
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await User.create({ name: 'QA Admin', email: ADMIN_EMAIL, password: 'admin123', role: 'Admin', status: 'Active' });
});

test.after(async () => {
  await Promise.allSettled([
    User.deleteOne({ email: ADMIN_EMAIL }),
    Customer.deleteMany({ phone: new RegExp(`(${PHONE_A}|${PHONE_B})$`) }),
    Order.deleteMany({ customerPhone: new RegExp(`(${PHONE_A}|${PHONE_B})$`) }),
    Coupon.deleteMany({ code: COUPON }),
    Otp.deleteMany({ phone: { $in: [PHONE_A, PHONE_B] } }),
  ]);
  await mongoose.disconnect();
});

const loginAdmin = async () => {
  const res = await api().post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'admin123' });
  assert.equal(res.status, 200);
  return res.body.token;
};

const customerToken = async (phone) => {
  await api().post('/api/customers/otp/send').send({ phone });
  const res = await api().post('/api/customers/otp/verify').send({ phone, code: '000000' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.token;
};

test('health check', async () => {
  const res = await api().get('/');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'online');
});

test('catalog is public, orders/reviews are staff-only', async () => {
  assert.equal((await api().get('/api/products')).status, 200);
  assert.equal((await api().get('/api/orders')).status, 401);
  assert.equal((await api().get('/api/reviews')).status, 401);
});

test('OTP flow issues a customer JWT and rejects wrong codes', async () => {
  const send = await api().post('/api/customers/otp/send').send({ phone: PHONE_A });
  assert.equal(send.status, 200);
  assert.equal(send.body.testMode, true);
  assert.equal(send.body.devCode, '000000');

  const bad = await api().post('/api/customers/otp/verify').send({ phone: PHONE_A, code: '999999' });
  assert.equal(bad.status, 400);

  const ok = await api().post('/api/customers/otp/verify').send({ phone: PHONE_A, code: '000000' });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal(ok.body.customer.customerId, `cust_${PHONE_A}`);
});

test('protectCustomer gates /customers/me and rejects staff tokens', async () => {
  const cToken = await customerToken(PHONE_A);
  const sToken = await loginAdmin();

  assert.equal((await api().get('/api/customers/me')).status, 401);
  assert.equal((await api().get('/api/customers/me').set('Authorization', `Bearer ${sToken}`)).status, 401);

  const me = await api().get('/api/customers/me').set('Authorization', `Bearer ${cToken}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.customer.customerId, `cust_${PHONE_A}`);
});

test('coupon validate computes the discount server-side', async () => {
  const sToken = await loginAdmin();
  await api().post('/api/coupons').set('Authorization', `Bearer ${sToken}`).send({
    code: COUPON, discount: '₹50 OFF', description: 'test', minOrder: 150, value: 50, isPercent: false, active: true,
  });

  const good = await api().post('/api/coupons/validate').send({ code: COUPON, subtotal: 200 });
  assert.equal(good.body.valid, true);
  assert.equal(good.body.discount, 50);

  const belowMin = await api().post('/api/coupons/validate').send({ code: COUPON, subtotal: 100 });
  assert.equal(belowMin.body.valid, false);

  const bogus = await api().post('/api/coupons/validate').send({ code: 'NOPE_NOPE', subtotal: 200 });
  assert.equal(bogus.body.valid, false);
});

test('order placement is tied to the customer token; /orders/mine + ownership', async () => {
  const tokenA = await customerToken(PHONE_A);
  const tokenB = await customerToken(PHONE_B);

  const place = await api().post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({
    items: [{ productId: 'p_test', name: 'Test Item', quantity: 2, price: 40 }],
    itemTotal: 80, totalAmount: 125, deliveryFee: 40, handlingFee: 5,
    paymentMethod: 'COD', paymentStatus: 'Pending', status: 'Pending', deliveryAddress: 'QA Addr',
  });
  assert.equal(place.status, 201);
  const orderId = place.body.order.orderId;
  assert.equal(place.body.order.customerId, `cust_${PHONE_A}`);

  const mineNoToken = await api().get('/api/orders/mine');
  assert.equal(mineNoToken.status, 401);

  const mine = await api().get('/api/orders/mine').set('Authorization', `Bearer ${tokenA}`);
  assert.equal(mine.status, 200);
  assert.ok(mine.body.orders.some((o) => o.orderId === orderId));

  const own = await api().get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${tokenA}`);
  assert.equal(own.status, 200);

  const other = await api().get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${tokenB}`);
  assert.equal(other.status, 403);
});

test('status update appends a trackingTimeline entry (no throw)', async () => {
  const sToken = await loginAdmin();
  const tokenA = await customerToken(PHONE_A);
  const place = await api().post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({
    items: [{ productId: 'p_x', name: 'X', quantity: 1, price: 10 }],
    itemTotal: 10, totalAmount: 15, deliveryAddress: 'A',
  });
  const orderId = place.body.order.orderId;

  const upd = await api().put(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${sToken}`)
    .send({ status: 'Packed', note: 'packed in test' });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.order.status, 'Packed');
  assert.equal(upd.body.order.trackingTimeline.at(-1).status, 'Packed');
});

test('payment verify runs in test mode', async () => {
  const res = await api().post('/api/payment/verify').send({});
  assert.equal(res.body.verified, true);
  assert.equal(res.body.testMode, true);
});

test('payment create-order returns a key + orderId (test mode)', async () => {
  const res = await api().post('/api/payment/create-order').send({ amount: 250 });
  assert.equal(res.status, 200);
  assert.ok(res.body.orderId);
  assert.ok('key' in res.body);
});

test('payment verify rejects a bad signature when not in test mode', async () => {
  process.env.PAYMENTS_TEST_MODE = 'false';
  try {
    const res = await api().post('/api/payment/verify').send({
      razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'deadbeef',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.verified, false);
  } finally {
    process.env.PAYMENTS_TEST_MODE = 'true';
  }
});

test('wallet debit checks the balance', async () => {
  const token = await customerToken(PHONE_A);
  await Customer.updateOne({ customerId: `cust_${PHONE_A}` }, { $set: { walletBalance: 100 } });

  const tooMuch = await api().post('/api/customers/me/wallet/debit')
    .set('Authorization', `Bearer ${token}`).send({ amount: 500 });
  assert.equal(tooMuch.status, 400);

  const ok = await api().post('/api/customers/me/wallet/debit')
    .set('Authorization', `Bearer ${token}`).send({ amount: 60, orderId: 'QA1' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.walletBalance, 40);
});
