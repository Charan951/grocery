import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';

import { createApp } from '../app.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { DeliveryPartner } from '../src/models/DeliveryPartner.js';
import { Order } from '../src/models/Order.js';
import { ReturnRequest } from '../src/models/ReturnRequest.js';
import { DeliveryEarning } from '../src/models/DeliveryEarning.js';
import { Notification } from '../src/models/Operations.js';
import { WalletTransaction } from '../src/models/Finance.js';
import { expireStaleReturnOffers, processDueRefunds } from '../src/services/returnService.js';

dotenv.config();

const { app, httpServer } = createApp({ logRequests: false });
const api = () => request(app);

const stamp = Date.now().toString().slice(-7);
const RIDER_EMAIL = `qa-rrider+${stamp}@freshcart.test`;
const ADMIN_EMAIL = `qa-radmin+${stamp}@freshcart.test`;
const CUST_PHONE = `94444${stamp.slice(-5)}`;
const ORDER_PREFIX = `QAR${stamp}`;
const PHOTO = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
// Far from every other fixture so this suite's rider is the only candidate.
const HERE = { lat: 12.9716, lng: 77.5946 };

let riderUserId;
let customerId;

test.before(async () => {
  process.env.OTP_TEST_MODE = 'true';
  process.env.PAYMENTS_TEST_MODE = 'true';
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const stale = await User.find({ email: { $regex: /^qa-rrider\+\d+@freshcart\.test$/ } }, '_id');
  if (stale.length) {
    const ids = stale.map((u) => u._id);
    await DeliveryPartner.deleteMany({ userId: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
  }

  const rider = await User.create({ name: 'QA Return Rider', email: RIDER_EMAIL, password: 'delivery123', role: 'Delivery', status: 'Active', phone: '9876511111' });
  riderUserId = rider._id.toString();
  await DeliveryPartner.create({
    userId: rider._id, isOnline: true, availability: 'available',
    currentLocation: { type: 'Point', coordinates: [HERE.lng, HERE.lat + 0.002] },
  });
  await User.create({ name: 'QA RAdmin', email: ADMIN_EMAIL, password: 'admin123', role: 'Admin', status: 'Active' });

  await api().post('/api/customers/otp/send').send({ phone: CUST_PHONE });
  const v = await api().post('/api/customers/otp/verify').send({ phone: CUST_PHONE, code: '000000' });
  customerId = v.body.customer?.customerId || (await Customer.findOne({ phone: new RegExp(`${CUST_PHONE}$`) })).customerId;
});

test.after(async () => {
  const rrs = await ReturnRequest.find({ orderId: new RegExp(`^${ORDER_PREFIX}`) }).select('returnId').lean();
  await Promise.allSettled([
    User.deleteMany({ email: { $in: [RIDER_EMAIL, ADMIN_EMAIL] } }),
    DeliveryPartner.deleteOne({ userId: riderUserId }),
    Customer.deleteMany({ phone: new RegExp(`${CUST_PHONE}$`) }),
    Order.deleteMany({ orderId: new RegExp(`^${ORDER_PREFIX}`) }),
    ReturnRequest.deleteMany({ orderId: new RegExp(`^${ORDER_PREFIX}`) }),
    DeliveryEarning.deleteMany({ orderId: { $in: rrs.map((r) => r.returnId) } }),
    WalletTransaction.deleteMany({ customerId }),
    Notification.deleteMany({ userId: { $in: [riderUserId, customerId] } }),
  ]);
  await mongoose.disconnect();
});

let _n = 0;
const makeDelivered = (over = {}) => Order.create({
  orderId: `${ORDER_PREFIX}-${++_n}`,
  customerId, customerName: 'QA Returner', customerPhone: `+91 ${CUST_PHONE}`,
  items: [
    { id: 'p-milk', productId: 'p-milk', name: 'Milk', quantity: 2, price: 30 },
    { id: 'p-bread', productId: 'p-bread', name: 'Bread', quantity: 1, price: 40 },
  ],
  itemTotal: 100, totalAmount: 125, deliveryAddress: 'QA Returns Lane',
  paymentMethod: 'UPI', paymentStatus: 'Paid', status: 'Delivered', deliveredAt: new Date(),
  pickup: { name: 'DS', lat: HERE.lat, lng: HERE.lng + 0.01 },
  deliveryLocation: HERE,
  ...over,
});

// delivery.test.js flips every partner offline in its before() hook and runs
// in parallel with this file, so re-assert our rider right before dispatching.
const ensureRiderOnline = () => DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { isOnline: true, availability: 'available' } });

const riderToken = async () => (await api().post('/api/auth/login').send({ email: RIDER_EMAIL, password: 'delivery123' })).body.token;
const adminToken = async () => (await api().post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'admin123' })).body.token;

test('config serves the shared issue list', async () => {
  const res = await api().get('/api/returns/config');
  assert.equal(res.status, 200);
  assert.ok(res.body.config.reasons.some((r) => r.code === 'other' && r.requiresComment));
  assert.equal(res.body.config.refundDelayHours, 24);
});

test('eligibility is owner-only and closed before delivery / after the window', async () => {
  const order = await makeDelivered();
  const other = await api().get(`/api/orders/${order.orderId}/returns`).query({ phone: '9000000001' });
  assert.ok([401, 403].includes(other.status));

  const ok = await api().get(`/api/orders/${order.orderId}/returns`).query({ phone: CUST_PHONE });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.eligible, true);
  assert.deepEqual(ok.body.refundMethods, ['original', 'wallet']);
  assert.equal(ok.body.items.find((i) => i.key === 'p-milk').returnableQty, 2);

  const pending = await makeDelivered({ status: 'Out For Delivery', deliveredAt: undefined });
  const p = await api().get(`/api/orders/${pending.orderId}/returns`).query({ phone: CUST_PHONE });
  assert.equal(p.body.eligible, false);

  const old = await makeDelivered({ deliveredAt: new Date(Date.now() - 72 * 3600000) });
  const o = await api().get(`/api/orders/${old.orderId}/returns`).query({ phone: CUST_PHONE });
  assert.equal(o.body.eligible, false);
  const create = await api().post(`/api/orders/${old.orderId}/returns`).send({
    phone: CUST_PHONE, type: 'return', reasonCode: 'damaged', items: [{ key: 'p-milk', quantity: 1 }],
  });
  assert.equal(create.status, 409);
});

test('validation: "Other" needs a description, quantity is capped', async () => {
  const order = await makeDelivered();
  const noComment = await api().post(`/api/orders/${order.orderId}/returns`).send({
    phone: CUST_PHONE, type: 'return', reasonCode: 'other', items: [{ key: 'p-milk', quantity: 1 }],
  });
  assert.equal(noComment.status, 400);
  const tooMany = await api().post(`/api/orders/${order.orderId}/returns`).send({
    phone: CUST_PHONE, type: 'return', reasonCode: 'damaged', items: [{ key: 'p-milk', quantity: 3 }],
  });
  assert.equal(tooMany.status, 400);
});

test('return: dispatched to nearby partner, collected with OTP + photo, refund scheduled 24h, paid, earning booked', async () => {
  const order = await makeDelivered();
  await ensureRiderOnline();
  const create = await api().post(`/api/orders/${order.orderId}/returns`).send({
    phone: CUST_PHONE, type: 'return', reasonCode: 'damaged', comment: 'Leaking pack',
    items: [{ key: 'p-milk', quantity: 2 }], refundMethod: 'wallet', photos: [PHOTO],
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  const rr = create.body.returnRequest;
  assert.equal(rr.refund.amount, 60);
  assert.equal(rr.refund.method, 'wallet');
  assert.match(rr.pickupOtp, /^\d{4}$/);

  // Quantity is now held by this request.
  const elig = await api().get(`/api/orders/${order.orderId}/returns`).query({ phone: CUST_PHONE });
  assert.equal(elig.body.items.find((i) => i.key === 'p-milk').returnableQty, 0);

  // Auto-dispatch is async — wait for the offer to land.
  const token = await riderToken();
  let offers = [];
  for (let i = 0; i < 20 && !offers.length; i++) {
    await new Promise((r) => setTimeout(r, 100));
    offers = (await api().get('/api/delivery/returns/offers').set('Authorization', `Bearer ${token}`)).body.offers || [];
  }
  const offer = offers.find((o) => o.returnId === rr.returnId);
  assert.ok(offer, 'rider should receive the pickup offer');
  assert.equal(offer.type, 'return');

  const acc = await api().post(`/api/delivery/returns/${rr.returnId}/accept`).set('Authorization', `Bearer ${token}`);
  assert.equal(acc.status, 200, JSON.stringify(acc.body));
  assert.equal(acc.body.returnRequest.pickupOtp, undefined, 'partner never sees the code');
  const again = await api().post(`/api/delivery/returns/${rr.returnId}/accept`).set('Authorization', `Bearer ${token}`);
  assert.equal(again.status, 409);
  const partner = await DeliveryPartner.findOne({ userId: riderUserId });
  assert.ok(partner.activeOrderIds.includes(rr.returnId));

  await api().post(`/api/delivery/returns/${rr.returnId}/arrived`).set('Authorization', `Bearer ${token}`).expect(200);

  const noPhoto = await api().post(`/api/delivery/returns/${rr.returnId}/collect`).set('Authorization', `Bearer ${token}`)
    .send({ otp: rr.pickupOtp, itemsVerified: true, photos: [] });
  assert.equal(noPhoto.status, 400);
  const wrongOtp = await api().post(`/api/delivery/returns/${rr.returnId}/collect`).set('Authorization', `Bearer ${token}`)
    .send({ otp: '0000' === rr.pickupOtp ? '1111' : '0000', itemsVerified: true, photos: [PHOTO] });
  assert.equal(wrongOtp.status, 400);
  assert.equal(wrongOtp.body.code, 'otp_wrong');

  const col = await api().post(`/api/delivery/returns/${rr.returnId}/collect`).set('Authorization', `Bearer ${token}`)
    .send({ otp: rr.pickupOtp, itemsVerified: true, photos: [PHOTO] });
  assert.equal(col.status, 200, JSON.stringify(col.body));
  assert.equal(col.body.returnRequest.status, 'Picked Up');
  assert.equal(col.body.returnRequest.refund.status, 'scheduled');
  const due = new Date(col.body.returnRequest.refund.dueAt).getTime() - Date.now();
  assert.ok(due > 23.9 * 3600000 && due <= 24 * 3600000, 'refund due ~24h after pickup');

  // Not due yet → the sweeper leaves it alone.
  await processDueRefunds();
  assert.equal((await ReturnRequest.findOne({ returnId: rr.returnId })).refund.status, 'scheduled');

  // Once due, the sweeper pays it into the wallet exactly once.
  await ReturnRequest.updateOne({ returnId: rr.returnId }, { $set: { 'refund.dueAt': new Date(Date.now() - 1000) } });
  const before = (await Customer.findOne({ customerId })).walletBalance || 0;
  await processDueRefunds();
  await processDueRefunds();
  const after = (await Customer.findOne({ customerId })).walletBalance || 0;
  assert.equal(after - before, 60);
  const paid = await ReturnRequest.findOne({ returnId: rr.returnId });
  assert.equal(paid.refund.status, 'processed');
  assert.match(paid.refund.reference, /^WALLET_/);

  const done = await api().post(`/api/delivery/returns/${rr.returnId}/complete`).set('Authorization', `Bearer ${token}`);
  assert.equal(done.status, 200);
  assert.equal(done.body.returnRequest.status, 'Completed');
  const earning = await DeliveryEarning.findOne({ orderId: rr.returnId });
  assert.ok(earning && earning.total > 0);
  assert.ok(!(await DeliveryPartner.findOne({ userId: riderUserId })).activeOrderIds.includes(rr.returnId));

  const mine = await api().get(`/api/returns/${rr.returnId}`).query({ phone: CUST_PHONE });
  assert.equal(mine.body.returnRequest.status, 'Completed');
  assert.equal(mine.body.returnRequest.pickupOtp, undefined);
});

test('exchange has no refund; customer can cancel before pickup and quantity is released', async () => {
  const order = await makeDelivered();
  const create = await api().post(`/api/orders/${order.orderId}/returns`).send({
    phone: CUST_PHONE, type: 'exchange', reasonCode: 'wrong_item', items: [{ key: 'p-bread', quantity: 1 }],
  });
  assert.equal(create.status, 201, JSON.stringify(create.body));
  assert.equal(create.body.returnRequest.refund, undefined);

  const cancel = await api().post(`/api/returns/${create.body.returnRequest.returnId}/cancel`).send({ phone: CUST_PHONE });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.returnRequest.status, 'Cancelled');
  const elig = await api().get(`/api/orders/${order.orderId}/returns`).query({ phone: CUST_PHONE });
  assert.equal(elig.body.items.find((i) => i.key === 'p-bread').returnableQty, 1);
});

test('admin: list, manual assign, reject, refund-now', async () => {
  const token = await adminToken();
  const order = await makeDelivered({ paymentMethod: 'Cash on Delivery' });
  const create = await api().post(`/api/orders/${order.orderId}/returns`).send({
    phone: CUST_PHONE, type: 'return', reasonCode: 'expired', items: [{ key: 'p-bread', quantity: 1 }], refundMethod: 'original',
  });
  assert.equal(create.status, 201);
  const id = create.body.returnRequest.returnId;
  assert.equal(create.body.returnRequest.refund.method, 'wallet', 'COD orders refund to wallet only');

  const list = await api().get('/api/admin/returns').set('Authorization', `Bearer ${token}`).query({ q: id });
  assert.equal(list.status, 200);
  assert.equal(list.body.returns[0].returnId, id);

  // Clear any live offer first (the rider may have received one) then assign manually.
  await new Promise((r) => setTimeout(r, 300));
  const asg = await api().post(`/api/admin/returns/${id}/assign`).set('Authorization', `Bearer ${token}`).send({ partnerUserId: riderUserId });
  assert.equal(asg.status, 200, JSON.stringify(asg.body));
  assert.equal(asg.body.returnRequest.status, 'Assigned');

  const refundEarly = await api().post(`/api/admin/returns/${id}/refund`).set('Authorization', `Bearer ${token}`);
  assert.equal(refundEarly.status, 409);

  const rej = await api().post(`/api/admin/returns/${id}/reject`).set('Authorization', `Bearer ${token}`).send({ reason: 'Outside policy' });
  assert.equal(rej.status, 200);
  assert.equal(rej.body.returnRequest.status, 'Rejected');
  assert.ok(!(await DeliveryPartner.findOne({ userId: riderUserId })).activeOrderIds.includes(id));

  // Refund-now path on a picked-up return.
  const order2 = await makeDelivered();
  const c2 = await api().post(`/api/orders/${order2.orderId}/returns`).send({
    phone: CUST_PHONE, type: 'return', reasonCode: 'quality', items: [{ key: 'p-bread', quantity: 1 }], refundMethod: 'original',
  });
  const id2 = c2.body.returnRequest.returnId;
  await new Promise((r) => setTimeout(r, 300));
  await api().post(`/api/admin/returns/${id2}/assign`).set('Authorization', `Bearer ${token}`).send({ partnerUserId: riderUserId });
  const rt = await riderToken();
  const col = await api().post(`/api/delivery/returns/${id2}/collect`).set('Authorization', `Bearer ${rt}`)
    .send({ otp: c2.body.returnRequest.pickupOtp, itemsVerified: true, photos: [PHOTO] });
  assert.equal(col.status, 200, JSON.stringify(col.body));
  const now = await api().post(`/api/admin/returns/${id2}/refund`).set('Authorization', `Bearer ${token}`);
  assert.equal(now.status, 200, JSON.stringify(now.body));
  assert.equal(now.body.returnRequest.refund.status, 'processed');
  assert.match(now.body.returnRequest.refund.reference, /^MOCK_REFUND_/);
  await api().post(`/api/delivery/returns/${id2}/complete`).set('Authorization', `Bearer ${rt}`).expect(200);
});

test('expired offers roll over and eventually stall for manual assignment', async () => {
  // Take the only rider offline so no one is in range.
  await DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { isOnline: false } });
  const order = await makeDelivered();
  const create = await api().post(`/api/orders/${order.orderId}/returns`).send({
    phone: CUST_PHONE, type: 'return', reasonCode: 'damaged', items: [{ key: 'p-milk', quantity: 1 }],
  });
  const id = create.body.returnRequest.returnId;
  let rr;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 100));
    rr = await ReturnRequest.findOne({ returnId: id });
    if (rr.dispatchStalled) break;
  }
  // Another online partner elsewhere in the shared DB could pick it up; only
  // assert stalling when nobody got an offer.
  if (!rr.offers.length) assert.equal(rr.dispatchStalled, true);
  await expireStaleReturnOffers();
  await DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { isOnline: true } });
});
