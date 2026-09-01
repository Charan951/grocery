import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';

import { createApp } from '../app.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Order } from '../src/models/Order.js';
import { Coupon, WalletTransaction } from '../src/models/Finance.js';
import { Otp } from '../src/models/Otp.js';
import { Product } from '../src/models/Catalog.js';
import { Review } from '../src/models/Operations.js';
import { outbox, clearOutbox } from '../src/services/mailService.js';

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
const RIDER_EMAIL = `qa.rider+${stamp}@freshcart.test`;

test.before(async () => {
  process.env.PAYMENTS_TEST_MODE = 'true';
  process.env.OTP_TEST_MODE = 'true';
  process.env.MAIL_TEST_MODE = 'true';
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await User.create({ name: 'QA Admin', email: ADMIN_EMAIL, password: 'admin123', role: 'Admin', status: 'Active' });
  await Product.create({
    id: REVIEW_PRODUCT_ID, name: 'QA Review Product', price: 40, mrp: 50,
    category: 'Grocery', categoryId: 'c1', brand: 'FreshCart',
    stock: { status: 'In Stock', quantity: 12 },
  });
  await Product.create({
    id: `${REVIEW_PRODUCT_ID}_x`, name: 'QA Filter Product', price: 90, mrp: 90,
    category: 'Grocery', categoryId: 'c1', brand: 'QA Brand X',
    stock: { status: 'Out of Stock', quantity: 0 },
  });
});

test.after(async () => {
  await Promise.allSettled([
    User.deleteMany({ email: { $in: [ADMIN_EMAIL, RIDER_EMAIL] } }),
    Customer.deleteMany({ phone: new RegExp(`(${PHONE_A}|${PHONE_B})$`) }),
    Order.deleteMany({ customerPhone: new RegExp(`(${PHONE_A}|${PHONE_B})$`) }),
    Coupon.deleteMany({ code: COUPON }),
    Otp.deleteMany({ phone: { $in: [PHONE_A, PHONE_B] } }),
    Product.deleteMany({ id: { $in: [REVIEW_PRODUCT_ID, `${REVIEW_PRODUCT_ID}_x`] } }),
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

test('GET /products: brand + inStock + onSale filters and opt-in pagination', async () => {
  const brandHit = await api().get('/api/products?brand=QA%20Brand%20X');
  assert.equal(brandHit.status, 200);
  assert.ok(brandHit.body.products.every((p) => /qa brand x/i.test(p.brand)));

  const inStock = await api().get('/api/products?inStock=true&brand=QA%20Brand%20X');
  assert.equal(inStock.body.products.length, 0); // the QA Brand X product is out of stock

  const onSale = await api().get(`/api/products?onSale=true&categoryId=c1`);
  assert.ok(onSale.body.products.some((p) => p.id === REVIEW_PRODUCT_ID)); // 40 < 50
  assert.ok(!onSale.body.products.some((p) => p.id === `${REVIEW_PRODUCT_ID}_x`)); // 90 == 90

  const paged = await api().get('/api/products?page=1&limit=1');
  assert.equal(paged.status, 200);
  assert.equal(paged.body.products.length, 1);
  assert.equal(paged.body.page, 1);
  assert.equal(paged.body.limit, 1);
  assert.ok(paged.body.total >= 2);
  assert.ok(paged.body.totalPages >= 2);

  // no page/limit → unchanged full-list shape
  const all = await api().get('/api/products');
  assert.ok(Array.isArray(all.body.products) && all.body.count === all.body.products.length);
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

test('admin bulk review moderation approves/rejects many at once', async () => {
  const sToken = await loginAdmin();
  const made = await Review.create([
    { productId: REVIEW_PRODUCT_ID, customerId: `cust_${PHONE_A}`, customerName: 'B1', rating: 5, comment: 'a', status: 'Pending' },
    { productId: REVIEW_PRODUCT_ID, customerId: `cust_${PHONE_B}`, customerName: 'B2', rating: 4, comment: 'b', status: 'Pending' },
  ]);
  const ids = made.map((r) => String(r._id));

  const bad = await api().put('/api/reviews/bulk-status')
    .set('Authorization', `Bearer ${sToken}`).send({ ids: [], status: 'Approved' });
  assert.equal(bad.status, 400);

  const ok = await api().put('/api/reviews/bulk-status')
    .set('Authorization', `Bearer ${sToken}`).send({ ids, status: 'Approved' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.updated, 2);

  const rows = await Review.find({ _id: { $in: ids } }).select('status').lean();
  assert.ok(rows.every((r) => r.status === 'Approved'));

  await Review.deleteMany({ _id: { $in: ids } });
});

test('wallet top-up: create order then verify credits the balance + ledger (test mode)', async () => {
  const tokenA = await customerToken(PHONE_A);
  await Customer.updateOne({ customerId: `cust_${PHONE_A}` }, { $set: { walletBalance: 0 } });

  const bad = await api().post('/api/customers/me/wallet/topup')
    .set('Authorization', `Bearer ${tokenA}`).send({ amount: 0 });
  assert.equal(bad.status, 400);

  const create = await api().post('/api/customers/me/wallet/topup')
    .set('Authorization', `Bearer ${tokenA}`).send({ amount: 250 });
  assert.equal(create.status, 200);
  assert.ok(create.body.orderId);
  assert.equal(create.body.amount, 25000);

  const verify = await api().post('/api/customers/me/wallet/topup/verify')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ amount: 250, razorpay_order_id: create.body.orderId, razorpay_payment_id: 'pay_test', razorpay_signature: 'sig' });
  assert.equal(verify.status, 200);
  assert.equal(verify.body.walletBalance, 250);

  const txns = await api().get('/api/customers/me/wallet/transactions')
    .set('Authorization', `Bearer ${tokenA}`);
  assert.ok(txns.body.transactions.some((t) => t.type === 'Credit' && t.amount === 250));
});

test('COD orders are created Pending (never Paid on creation)', async () => {
  const tokenA = await customerToken(PHONE_A);
  const cod = await api().post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({
    items: [{ productId: 'p_cod', name: 'X', quantity: 1, price: 20 }],
    itemTotal: 20, totalAmount: 25, paymentMethod: 'Cash on Delivery', deliveryAddress: 'A',
  });
  assert.equal(cod.body.order.paymentStatus, 'Pending');

  const prepaid = await api().post('/api/orders').set('Authorization', `Bearer ${tokenA}`).send({
    items: [{ productId: 'p_pp', name: 'Y', quantity: 1, price: 20 }],
    itemTotal: 20, totalAmount: 25, paymentMethod: 'Razorpay UPI/Card', deliveryAddress: 'A',
  });
  assert.equal(prepaid.body.order.paymentStatus, 'Paid');
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

test('customer self-service account deletion cascades and scrubs orders', async () => {
  const token = await customerToken(PHONE_B);
  const cid = `cust_${PHONE_B}`;
  await Customer.updateOne({ customerId: cid }, { $set: { walletBalance: 50 } });
  await WalletTransaction.create({ customerId: cid, amount: 50, type: 'Credit', description: 'seed' });
  const place = await api().post('/api/orders').set('Authorization', `Bearer ${token}`).send({
    items: [{ productId: 'p_del', name: 'X', quantity: 1, price: 10 }],
    itemTotal: 10, totalAmount: 10, deliveryAddress: 'A',
  });
  const orderId = place.body.order.orderId;

  const del = await api().delete('/api/customers/me').set('Authorization', `Bearer ${token}`);
  assert.equal(del.status, 200);

  assert.equal(await Customer.countDocuments({ customerId: cid }), 0);
  assert.equal(await WalletTransaction.countDocuments({ customerId: cid }), 0);
  const order = await Order.findOne({ orderId });
  assert.equal(order.customerName, 'Deleted user');

  const me = await api().get('/api/customers/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 401);

  await WalletTransaction.deleteMany({ customerId: cid });
});

test('legacy DELETE /customers/:id now requires staff auth', async () => {
  const anon = await api().delete(`/api/customers/cust_${PHONE_A}`);
  assert.equal(anon.status, 401);
});

test('creating a Delivery employee emails their login credentials', async () => {
  const sToken = await loginAdmin();
  clearOutbox();

  const res = await api().post('/api/employees')
    .set('Authorization', `Bearer ${sToken}`)
    .send({ name: 'QA Rider', email: RIDER_EMAIL, phone: '9998887770', password: 'ride12345', role: 'Delivery' });
  assert.equal(res.status, 201);

  const mail = outbox.find((m) => m.to === RIDER_EMAIL);
  assert.ok(mail, 'expected a credentials email in the outbox');
  assert.match(mail.subject, /credentials/i);
  assert.ok(mail.text.includes(RIDER_EMAIL));
  assert.ok(mail.text.includes('ride12345'));

  // A non-Delivery employee does not get one.
  clearOutbox();
  await api().post('/api/employees')
    .set('Authorization', `Bearer ${sToken}`)
    .send({ name: 'QA Clerk', email: `qa.clerk+${stamp}@freshcart.test`, role: 'Employee' });
  assert.equal(outbox.length, 0);
  await User.deleteOne({ email: `qa.clerk+${stamp}@freshcart.test` });
});

test('resetting a partner password emails the new one', async () => {
  const sToken = await loginAdmin();
  const rider = await User.findOne({ email: RIDER_EMAIL });
  clearOutbox();

  const res = await api().post(`/api/admin/delivery/partners/${rider._id}/reset-password`)
    .set('Authorization', `Bearer ${sToken}`)
    .send({ password: 'newpass123' });
  assert.equal(res.status, 200);

  const mail = outbox.find((m) => m.to === RIDER_EMAIL);
  assert.ok(mail, 'expected a reset email');
  assert.match(mail.subject, /reset/i);
  assert.ok(mail.text.includes('newpass123'));
});

test('GET /app/config returns a version gate + maintenance shape', async () => {
  const res = await api().get('/api/app/config');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(typeof res.body.config.minSupportedVersion === 'string');
  assert.equal(typeof res.body.config.maintenance, 'boolean');
  assert.ok('updateUrl' in res.body.config);
  assert.ok('supportEmail' in res.body.config);
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
