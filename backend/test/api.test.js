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
import { Product } from '../src/models/Catalog.js';
import { Review } from '../src/models/Operations.js';

dotenv.config();

const { app } = createApp({ logRequests: false });
const api = () => request(app);

// Unique fixtures so runs don't collide and cleanup is targeted.
const stamp = Date.now().toString().slice(-7);
const PHONE_A = `90000${stamp.slice(-5)}`;
const PHONE_B = `91111${stamp.slice(-5)}`;
const COUPON = `TEST${stamp}`;
const ADMIN_EMAIL = `qa+${stamp}@freshcart.test`;
const REVIEW_PRODUCT_ID = `qa_prod_${stamp}`;

test.before(async () => {
  process.env.PAYMENTS_TEST_MODE = 'true';
  process.env.OTP_TEST_MODE = 'true';
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await User.create({ name: 'QA Admin', email: ADMIN_EMAIL, password: 'admin123', role: 'Admin', status: 'Active' });
  await Product.create({
    id: REVIEW_PRODUCT_ID, name: 'QA Review Product', price: 40, mrp: 50,
    category: 'Grocery', categoryId: 'c1', brand: 'FreshCart',
  });
});

test.after(async () => {
  await Promise.allSettled([
    User.deleteOne({ email: ADMIN_EMAIL }),
    Customer.deleteMany({ phone: new RegExp(`(${PHONE_A}|${PHONE_B})$`) }),
    Order.deleteMany({ customerPhone: new RegExp(`(${PHONE_A}|${PHONE_B})$`) }),
    Coupon.deleteMany({ code: COUPON }),
    Otp.deleteMany({ phone: { $in: [PHONE_A, PHONE_B] } }),
    Product.deleteOne({ id: REVIEW_PRODUCT_ID }),
    Review.deleteMany({ productId: REVIEW_PRODUCT_ID }),
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

test('customer can cancel a pre-dispatch order; a prepaid one refunds to the wallet', async () => {
  const tokenA = await customerToken(PHONE_A);
  const tokenB = await customerToken(PHONE_B);
  await Customer.updateOne({ customerId: `cust_${PHONE_A}` }, { $set: { walletBalance: 0 } });

  const place = await api().post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({
    items: [{ productId: 'p_c', name: 'C', quantity: 1, price: 100 }],
    itemTotal: 100, totalAmount: 150, paymentMethod: 'Razorpay UPI/Card',
    paymentStatus: 'Paid', status: 'In Transit', deliveryAddress: 'A',
  });
  const orderId = place.body.order.orderId;

  // Another customer cannot cancel it.
  const foreign = await api().post(`/api/orders/${orderId}/cancel`)
    .set('Authorization', `Bearer ${tokenB}`).send({ reason: 'nope' });
  assert.equal(foreign.status, 403);

  const cancel = await api().post(`/api/orders/${orderId}/cancel`)
    .set('Authorization', `Bearer ${tokenA}`).send({ reason: 'Ordered by mistake' });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.order.status, 'Cancelled');
  assert.equal(cancel.body.order.paymentStatus, 'Refunded');
  assert.equal(cancel.body.refunded, true);
  assert.equal(cancel.body.walletBalance, 150);
  assert.equal(cancel.body.order.trackingTimeline.at(-1).status, 'Cancelled');

  // Cancelling again is a conflict.
  const again = await api().post(`/api/orders/${orderId}/cancel`)
    .set('Authorization', `Bearer ${tokenA}`).send({});
  assert.equal(again.status, 409);

  // The refund shows up in the wallet ledger.
  const txns = await api().get('/api/customers/me/wallet/transactions')
    .set('Authorization', `Bearer ${tokenA}`);
  assert.equal(txns.status, 200);
  assert.ok(txns.body.transactions.some((t) => t.type === 'Credit' && t.amount === 150));
});

test('a dispatched order can no longer be cancelled by the customer', async () => {
  const sToken = await loginAdmin();
  const tokenA = await customerToken(PHONE_A);
  const place = await api().post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({
    items: [{ productId: 'p_d', name: 'D', quantity: 1, price: 10 }],
    itemTotal: 10, totalAmount: 15, paymentMethod: 'COD', paymentStatus: 'Pending',
    status: 'Pending', deliveryAddress: 'A',
  });
  const orderId = place.body.order.orderId;
  await api().put(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${sToken}`).send({ status: 'Out For Delivery' });

  const late = await api().post(`/api/orders/${orderId}/cancel`)
    .set('Authorization', `Bearer ${tokenA}`).send({ reason: 'too late' });
  assert.equal(late.status, 409);
});

test('product reviews: verified-purchase gate, moderation, and summary', async () => {
  const sToken = await loginAdmin();
  const tokenA = await customerToken(PHONE_A);

  // No delivered order yet → cannot review.
  const early = await api().post(`/api/products/${REVIEW_PRODUCT_ID}/reviews`)
    .set('Authorization', `Bearer ${tokenA}`).send({ rating: 5, comment: 'nice' });
  assert.equal(early.status, 403);

  // Place an order for the product and mark it Delivered.
  const place = await api().post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({
    items: [{ productId: REVIEW_PRODUCT_ID, name: 'QA Review Product', quantity: 1, price: 40 }],
    itemTotal: 40, totalAmount: 45, deliveryAddress: 'A',
  });
  await api().put(`/api/orders/${place.body.order.orderId}/status`)
    .set('Authorization', `Bearer ${sToken}`).send({ status: 'Delivered' });

  // Bad rating is rejected.
  const bad = await api().post(`/api/products/${REVIEW_PRODUCT_ID}/reviews`)
    .set('Authorization', `Bearer ${tokenA}`).send({ rating: 9 });
  assert.equal(bad.status, 400);

  // Valid review is accepted but held for moderation (Pending → not yet public).
  const created = await api().post(`/api/products/${REVIEW_PRODUCT_ID}/reviews`)
    .set('Authorization', `Bearer ${tokenA}`).send({ rating: 4, comment: 'Fresh and on time' });
  assert.equal(created.status, 201);
  assert.equal(created.body.review.status, 'Pending');

  let pub = await api().get(`/api/products/${REVIEW_PRODUCT_ID}/reviews`);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.summary.count, 0);

  // A second call edits the same review rather than adding another.
  const edit = await api().post(`/api/products/${REVIEW_PRODUCT_ID}/reviews`)
    .set('Authorization', `Bearer ${tokenA}`).send({ rating: 5, comment: 'Even better second time' });
  assert.equal(edit.status, 200);
  assert.equal(edit.body.updated, true);

  // Staff approves → it becomes public and the product aggregate updates.
  await api().put(`/api/reviews/${edit.body.review._id}/status`)
    .set('Authorization', `Bearer ${sToken}`).send({ status: 'Approved' });

  pub = await api().get(`/api/products/${REVIEW_PRODUCT_ID}/reviews`);
  assert.equal(pub.body.summary.count, 1);
  assert.equal(pub.body.summary.average, 5);
  assert.equal(pub.body.reviews[0].comment, 'Even better second time');
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
