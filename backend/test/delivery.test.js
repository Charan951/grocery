import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';

import { createApp } from '../app.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { DeliveryPartner } from '../src/models/DeliveryPartner.js';
import { Order } from '../src/models/Order.js';
import { Assignment } from '../src/models/Assignment.js';
import { tryAssign, rejectOffer } from '../src/services/assignmentService.js';
import { DeviceToken } from '../src/models/DeviceToken.js';
import { isPushConfigured } from '../src/services/pushService.js';

dotenv.config();

const { app, httpServer, io } = createApp({ logRequests: false });
const api = () => request(app);

const stamp = Date.now().toString().slice(-7);
const RIDER_EMAIL = `qa-rider+${stamp}@freshcart.test`;
const RIDER2_EMAIL = `qa-rider2+${stamp}@freshcart.test`;
const ADMIN_EMAIL = `qa-dadmin+${stamp}@freshcart.test`;
const CUST_PHONE = `95555${stamp.slice(-5)}`;
let baseUrl;
let riderUserId;
let rider2UserId;

test.before(async () => {
  process.env.OTP_TEST_MODE = 'true';
  process.env.PAYMENTS_TEST_MODE = 'true';
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const rider = await User.create({ name: 'QA Rider', email: RIDER_EMAIL, password: 'delivery123', role: 'Delivery', status: 'Active', phone: '9876500000' });
  riderUserId = rider._id.toString();
  const rider2 = await User.create({ name: 'QA Rider2', email: RIDER2_EMAIL, password: 'delivery123', role: 'Delivery', status: 'Active', phone: '9876500001' });
  rider2UserId = rider2._id.toString();
  await User.create({ name: 'QA DAdmin', email: ADMIN_EMAIL, password: 'admin123', role: 'Admin', status: 'Active' });
  await new Promise((r) => httpServer.listen(0, r));
  baseUrl = `http://localhost:${httpServer.address().port}`;
});

const ORDER_PREFIX = `QAD${stamp}`;

test.after(async () => {
  await Promise.allSettled([
    User.deleteOne({ email: RIDER_EMAIL }),
    User.deleteOne({ email: RIDER2_EMAIL }),
    User.deleteOne({ email: ADMIN_EMAIL }),
    DeliveryPartner.deleteOne({ userId: riderUserId }),
    DeliveryPartner.deleteOne({ userId: rider2UserId }),
    Customer.deleteMany({ phone: new RegExp(`${CUST_PHONE}$`) }),
    Order.deleteMany({ orderId: new RegExp(`^${ORDER_PREFIX}`) }),
    Assignment.deleteMany({ orderId: new RegExp(`^${ORDER_PREFIX}`) }),
    DeviceToken.deleteMany({ ownerId: { $in: [riderUserId, rider2UserId] } }),
  ]);
  await new Promise((r) => httpServer.close(r));
  await mongoose.disconnect();
});

let _n = 0;
const makeOrder = () =>
  Order.create({
    orderId: `${ORDER_PREFIX}-${++_n}`,
    customerId: 'cust_qa', customerName: 'QA Cust', customerPhone: '+91 9000000000',
    items: [{ name: 'Milk', quantity: 1, price: 50 }],
    itemTotal: 50, totalAmount: 75, deliveryAddress: 'QA Drop',
    status: 'Ready', pickup: { name: 'DS', lat: 17.44, lng: 78.37 },
    deliveryLocation: { lat: 17.45, lng: 78.38 },
  });

const riderToken = async (pw = 'delivery123') => {
  const res = await api().post('/api/auth/login').send({ email: RIDER_EMAIL, password: pw });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.token;
};
const adminToken = async () => {
  const res = await api().post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'admin123' });
  return res.body.token;
};
const custToken = async () => {
  await api().post('/api/customers/otp/send').send({ phone: CUST_PHONE });
  const v = await api().post('/api/customers/otp/verify').send({ phone: CUST_PHONE, code: '000000' });
  return v.body.token;
};

test('delivery user logs in and /delivery/me auto-creates the partner profile', async () => {
  const token = await riderToken();
  const me = await api().get('/api/delivery/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.partner.email, RIDER_EMAIL);
  assert.equal(me.body.partner.isOnline, false);
  const dp = await DeliveryPartner.findOne({ userId: riderUserId });
  assert.ok(dp, 'DeliveryPartner row created');
});

test('/delivery/* rejects no token, customer token, and admin (non-Delivery) token', async () => {
  assert.equal((await api().get('/api/delivery/me')).status, 401);
  assert.equal((await api().get('/api/delivery/me').set('Authorization', `Bearer ${await custToken()}`)).status, 403);
  assert.equal((await api().get('/api/delivery/me').set('Authorization', `Bearer ${await adminToken()}`)).status, 403);
});

test('online/offline toggle updates availability; cannot go offline mid-delivery', async () => {
  const token = await riderToken();
  let r = await api().put('/api/delivery/status').set('Authorization', `Bearer ${token}`).send({ isOnline: true });
  assert.equal(r.status, 200);
  assert.equal(r.body.availability, 'available');

  await DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { activeOrderIds: ['PN-QA-1'] } });
  r = await api().put('/api/delivery/status').set('Authorization', `Bearer ${token}`).send({ isOnline: false });
  assert.equal(r.status, 409);
  await DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { activeOrderIds: [] } });

  r = await api().put('/api/delivery/status').set('Authorization', `Bearer ${token}`).send({ isOnline: false });
  assert.equal(r.status, 200);
  assert.equal(r.body.availability, 'offline');
});

test('location heartbeat validates coordinates and persists', async () => {
  const token = await riderToken();
  assert.equal((await api().post('/api/delivery/location').set('Authorization', `Bearer ${token}`).send({ lat: 999, lng: 0 })).status, 400);

  const ok = await api().post('/api/delivery/location').set('Authorization', `Bearer ${token}`).send({ lat: 17.44, lng: 78.37 });
  assert.equal(ok.status, 200);
  const dp = await DeliveryPartner.findOne({ userId: riderUserId });
  assert.deepEqual(dp.currentLocation.coordinates, [78.37, 17.44]);
});

test('forgot -> reset password, then login with the new password', async () => {
  const f = await api().post('/api/delivery/auth/forgot').send({ email: RIDER_EMAIL });
  assert.equal(f.status, 200);
  assert.ok(f.body.devCode, 'reset code surfaced in test mode');

  const bad = await api().post('/api/delivery/auth/reset').send({ email: RIDER_EMAIL, code: '000000', password: 'newpass123' });
  assert.equal(bad.status, 400);

  const good = await api().post('/api/delivery/auth/reset').send({ email: RIDER_EMAIL, code: f.body.devCode, password: 'newpass123' });
  assert.equal(good.status, 200);

  await riderToken('newpass123'); // throws if login fails
  // reset back so other tests using the default password still work if re-run
  const f2 = await api().post('/api/delivery/auth/forgot').send({ email: RIDER_EMAIL });
  await api().post('/api/delivery/auth/reset').send({ email: RIDER_EMAIL, code: f2.body.devCode, password: 'delivery123' });
});

test('admin lists partners', async () => {
  const res = await api().get('/api/admin/delivery/partners').set('Authorization', `Bearer ${await adminToken()}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.partners.some((p) => p.userId === riderUserId));
});

test('admin resets a partner password (goes through the hash) and can re-login', async () => {
  const aTok = await adminToken();
  const short = await api().post(`/api/admin/delivery/partners/${riderUserId}/reset-password`)
    .set('Authorization', `Bearer ${aTok}`).send({ password: 'x' });
  assert.equal(short.status, 400);

  const ok = await api().post(`/api/admin/delivery/partners/${riderUserId}/reset-password`)
    .set('Authorization', `Bearer ${aTok}`).send({ password: 'reset-me-123' });
  assert.equal(ok.status, 200);
  await riderToken('reset-me-123'); // throws if the hash was not applied
  // restore
  await api().post(`/api/admin/delivery/partners/${riderUserId}/reset-password`)
    .set('Authorization', `Bearer ${aTok}`).send({ password: 'delivery123' });
});

test('admin deactivate blocks partner login; reactivate restores it', async () => {
  const aTok = await adminToken();
  await DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { activeOrderIds: [], isOnline: true } });

  const off = await api().post(`/api/admin/delivery/partners/${riderUserId}/account`)
    .set('Authorization', `Bearer ${aTok}`).send({ active: false });
  assert.equal(off.status, 200);
  assert.equal(off.body.accountStatus, 'Suspended');
  const dp = await DeliveryPartner.findOne({ userId: riderUserId });
  assert.equal(dp.isOnline, false);

  const blockedLogin = await api().post('/api/auth/login').send({ email: RIDER_EMAIL, password: 'delivery123' });
  assert.equal(blockedLogin.status, 403);

  const on = await api().post(`/api/admin/delivery/partners/${riderUserId}/account`)
    .set('Authorization', `Bearer ${aTok}`).send({ active: true });
  assert.equal(on.status, 200);
  assert.equal((await api().get('/api/delivery/me').set('Authorization', `Bearer ${await riderToken()}`)).status, 200);
});

// Isolated test region far from any seeded/real partner so $near only sees ours.
const TP = { name: 'QA remote DS', lat: 1.2345, lng: 1.2345 };
const bringOnline = (userId, lat, lng) =>
  DeliveryPartner.findOneAndUpdate(
    { userId },
    { $set: { isOnline: true, availability: 'available', activeOrderIds: [],
      currentLocation: { type: 'Point', coordinates: [lng, lat] }, locationUpdatedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
const makeRemoteOrder = () =>
  Order.create({
    orderId: `${ORDER_PREFIX}-R${++_n}`,
    customerId: 'cust_qa', customerName: 'QA Cust', customerPhone: '+91 9000000000',
    items: [{ name: 'Milk', quantity: 1, price: 50 }],
    itemTotal: 50, totalAmount: 75, deliveryAddress: 'QA Drop',
    status: 'Ready', pickup: TP, deliveryLocation: { lat: TP.lat + 0.01, lng: TP.lng + 0.01 },
  });

test('GET /api/orders/:id exposes a masked rider block, revealed only Out For Delivery/Arrived', async () => {
  await DeliveryPartner.updateOne(
    { userId: riderUserId },
    { $set: { phone: '9876500000', currentLocation: { type: 'Point', coordinates: [78.37, 17.44] }, locationUpdatedAt: new Date() } },
    { upsert: true }
  );
  const order = await makeOrder();
  await Order.updateOne({ orderId: order.orderId }, {
    $set: { deliveryPartnerUserId: riderUserId, deliveryPartnerName: 'QA Rider Longname', status: 'Assigned', deliveryOtp: '4321' },
  });

  // before the reveal window
  let r = await api().get(`/api/orders/${order.orderId}`);
  assert.equal(r.status, 200);
  assert.ok(r.body.order.delivery, 'delivery block present');
  assert.equal(r.body.order.delivery.partnerName, 'QA'); // first name only
  assert.equal(r.body.order.delivery.revealed, false);
  assert.equal(r.body.order.delivery.phone, null);
  assert.equal(r.body.order.delivery.location, null);
  assert.match(r.body.order.delivery.phoneMasked, /••/);
  assert.equal(r.body.order.deliveryOtp, undefined); // never to a non-owner

  // in the reveal window
  await Order.updateOne({ orderId: order.orderId }, { $set: { status: 'Out For Delivery' } });
  r = await api().get(`/api/orders/${order.orderId}`);
  assert.equal(r.body.order.delivery.revealed, true);
  assert.equal(r.body.order.delivery.phone, '9876500000');
  assert.ok(r.body.order.delivery.location && r.body.order.delivery.location.lat === 17.44);
});

test('partner FCM device token register is idempotent + unregister; push stays optional', async () => {
  const tok = await riderToken();
  const fcm = `qa-fcm-${stamp}`;

  assert.equal((await api().post('/api/delivery/devices').set('Authorization', `Bearer ${tok}`).send({})).status, 400);

  await api().post('/api/delivery/devices').set('Authorization', `Bearer ${tok}`).send({ token: fcm, platform: 'android' });
  await api().post('/api/delivery/devices').set('Authorization', `Bearer ${tok}`).send({ token: fcm, platform: 'ios' });
  let rows = await DeviceToken.find({ token: fcm });
  assert.equal(rows.length, 1); // upsert, not duplicated
  assert.equal(rows[0].ownerType, 'partner');
  assert.equal(rows[0].ownerId, riderUserId);
  assert.equal(rows[0].platform, 'ios');

  const del = await api().delete(`/api/delivery/devices/${fcm}`).set('Authorization', `Bearer ${tok}`);
  assert.equal(del.status, 200);
  assert.equal((await DeviceToken.find({ token: fcm })).length, 0);

  // No service account in CI/dev → sends are a safe no-op, offers still work.
  assert.equal(isPushConfigured(), false);
});

test('admin partner performance + deliveries endpoints', async () => {
  const aTok = await adminToken();
  const perf = await api().get(`/api/admin/delivery/partners/${riderUserId}/performance`).set('Authorization', `Bearer ${aTok}`);
  assert.equal(perf.status, 200);
  assert.equal(perf.body.partner.userId, riderUserId);
  assert.ok(typeof perf.body.performance.offered === 'number');
  assert.ok('acceptanceRate' in perf.body.performance);

  const del = await api().get(`/api/admin/delivery/partners/${riderUserId}/deliveries?limit=10`).set('Authorization', `Bearer ${aTok}`);
  assert.equal(del.status, 200);
  assert.ok(Array.isArray(del.body.deliveries));

  const missing = await api().get('/api/admin/delivery/partners/000000000000000000000000/performance').set('Authorization', `Bearer ${aTok}`);
  assert.equal(missing.status, 404);
});

test('auto-assign: order → Ready offers the nearest online partner (source=auto)', async () => {
  await bringOnline(riderUserId, TP.lat + 0.001, TP.lng + 0.001);
  await DeliveryPartner.updateOne({ userId: rider2UserId }, { $set: { isOnline: false } });

  const order = await makeRemoteOrder();
  const r = await tryAssign(order.orderId);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.partnerUserId, riderUserId);

  const a = await Assignment.findOne({ orderId: order.orderId, source: 'auto' });
  assert.ok(a);
  assert.equal(a.status, 'offered');
  assert.equal(String(a.partnerUserId), riderUserId);

  // calling again while an offer is live is a no-op
  const again = await tryAssign(order.orderId);
  assert.equal(again.ok, false);
  assert.equal(again.code, 'offer_pending');

  await Assignment.updateOne({ _id: a._id }, { $set: { status: 'cancelled' } });
});

test('auto-assign: decline rolls to the next candidate, then stalls when exhausted', async () => {
  await bringOnline(riderUserId, TP.lat + 0.001, TP.lng + 0.001);
  await bringOnline(rider2UserId, TP.lat + 0.002, TP.lng + 0.002);

  const order = await makeRemoteOrder();
  const r1 = await tryAssign(order.orderId);
  assert.equal(r1.ok, true);
  const first = r1.partnerUserId;
  const a1 = await Assignment.findOne({ orderId: order.orderId, status: 'offered' });

  // first partner declines → auto re-offer to the other one
  await rejectOffer({ assignmentId: a1._id, user: { _id: first, name: 'x' } });
  const a2 = await Assignment.findOne({ orderId: order.orderId, status: 'offered' });
  assert.ok(a2, 're-offer should be live');
  assert.notEqual(String(a2.partnerUserId), first);
  assert.equal(a2.attempt, 2);

  // second partner declines too → no candidates left → stalled
  await rejectOffer({ assignmentId: a2._id, user: { _id: String(a2.partnerUserId), name: 'y' } });
  assert.equal(await Assignment.findOne({ orderId: order.orderId, status: 'offered' }), null);
  const stalled = await Order.findOne({ orderId: order.orderId });
  assert.equal(stalled.assignmentStalled, true);
  assert.equal(stalled.deliveryPartnerUserId, undefined);
});

test('manual offer → partner accepts → order Assigned + partner queue updated', async () => {
  const rTok = await riderToken();
  const aTok = await adminToken();
  await api().put('/api/delivery/status').set('Authorization', `Bearer ${rTok}`).send({ isOnline: true });
  await api().post('/api/delivery/location').set('Authorization', `Bearer ${rTok}`).send({ lat: 17.44, lng: 78.37 });

  const order = await makeOrder();
  const offer = await api().post(`/api/admin/orders/${order.orderId}/assign`)
    .set('Authorization', `Bearer ${aTok}`).send({ partnerUserId: riderUserId });
  assert.equal(offer.status, 200);
  assert.equal(offer.body.mode, 'offered');
  const assignmentId = offer.body.assignmentId;

  const acc = await api().post(`/api/delivery/assignments/${assignmentId}/accept`).set('Authorization', `Bearer ${rTok}`);
  assert.equal(acc.status, 200);
  assert.equal(acc.body.order.status, 'Assigned');
  assert.equal(String(acc.body.order.deliveryPartnerUserId), riderUserId);

  const dp = await DeliveryPartner.findOne({ userId: riderUserId });
  assert.ok(dp.activeOrderIds.includes(order.orderId));

  // second accept of the same (now non-offered) assignment → 409
  const again = await api().post(`/api/delivery/assignments/${assignmentId}/accept`).set('Authorization', `Bearer ${rTok}`);
  assert.equal(again.status, 409);

  await DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { activeOrderIds: [] } });
});

test('manual offer → partner rejects → order flagged stalled', async () => {
  const rTok = await riderToken();
  const aTok = await adminToken();
  const order = await makeOrder();
  const offer = await api().post(`/api/admin/orders/${order.orderId}/assign`)
    .set('Authorization', `Bearer ${aTok}`).send({ partnerUserId: riderUserId });
  const rej = await api().post(`/api/delivery/assignments/${offer.body.assignmentId}/reject`)
    .set('Authorization', `Bearer ${rTok}`).send({ reason: 'too far' });
  assert.equal(rej.status, 200);

  const fresh = await Order.findOne({ orderId: order.orderId });
  assert.equal(fresh.assignmentStalled, true);
  assert.equal(fresh.deliveryPartnerUserId, undefined);
});

test('admin force-assign skips the offer; unassign releases the partner', async () => {
  const aTok = await adminToken();
  const order = await makeOrder();

  const forced = await api().post(`/api/admin/orders/${order.orderId}/assign`)
    .set('Authorization', `Bearer ${aTok}`).send({ partnerUserId: riderUserId, force: true });
  assert.equal(forced.status, 200);
  assert.equal(forced.body.mode, 'forced');
  assert.equal(forced.body.order.status, 'Assigned');
  let dp = await DeliveryPartner.findOne({ userId: riderUserId });
  assert.ok(dp.activeOrderIds.includes(order.orderId));

  const un = await api().post(`/api/admin/orders/${order.orderId}/unassign`)
    .set('Authorization', `Bearer ${aTok}`).send({ reason: 'customer rescheduled' });
  assert.equal(un.status, 200);
  assert.equal(un.body.order.status, 'Ready');
  assert.equal(un.body.order.deliveryPartnerUserId, undefined);
  dp = await DeliveryPartner.findOne({ userId: riderUserId });
  assert.ok(!dp.activeOrderIds.includes(order.orderId));
});

const assignAndAccept = async (rTok, aTok) => {
  await api().put('/api/delivery/status').set('Authorization', `Bearer ${rTok}`).send({ isOnline: true });
  await api().post('/api/delivery/location').set('Authorization', `Bearer ${rTok}`).send({ lat: 17.44, lng: 78.37 });
  const order = await makeOrder();
  const offer = await api().post(`/api/admin/orders/${order.orderId}/assign`)
    .set('Authorization', `Bearer ${aTok}`).send({ partnerUserId: riderUserId });
  await api().post(`/api/delivery/assignments/${offer.body.assignmentId}/accept`).set('Authorization', `Bearer ${rTok}`);
  return order.orderId;
};

test('full lifecycle: pickup-arrived → picked-up → arrived → complete (OTP)', async () => {
  const rTok = await riderToken();
  const aTok = await adminToken();
  const orderId = await assignAndAccept(rTok, aTok);
  const D = (suffix) => api().post(`/api/delivery/orders/${orderId}/${suffix}`).set('Authorization', `Bearer ${rTok}`);

  assert.equal((await D('pickup-arrived')).body.order.status, 'Arrived At Store');
  const pu = await D('picked-up');
  assert.equal(pu.body.order.status, 'Out For Delivery');
  assert.ok(pu.body.order.pickedUpAt);
  assert.equal((await D('arrived')).body.order.status, 'Arrived');

  // rider never gets the OTP back; read it straight from the DB for the test
  const otp = (await Order.findOne({ orderId })).deliveryOtp;
  const bad = await api().post(`/api/delivery/orders/${orderId}/complete`).set('Authorization', `Bearer ${rTok}`).send({ otp: '0000' });
  assert.equal(bad.status, 400);
  const ok = await api().post(`/api/delivery/orders/${orderId}/complete`).set('Authorization', `Bearer ${rTok}`).send({ otp });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.order.status, 'Delivered');
  assert.ok(ok.body.order.deliveredAt);

  // idempotent
  assert.equal((await api().post(`/api/delivery/orders/${orderId}/complete`).set('Authorization', `Bearer ${rTok}`).send({ otp })).body.idempotent, true);

  const dp = await DeliveryPartner.findOne({ userId: riderUserId });
  assert.ok(!dp.activeOrderIds.includes(orderId));
  assert.ok(dp.completedCount >= 1);
});

test('wrong OTP three times locks completion', async () => {
  const rTok = await riderToken();
  const aTok = await adminToken();
  const orderId = await assignAndAccept(rTok, aTok);
  const D = (s, b) => api().post(`/api/delivery/orders/${orderId}/${s}`).set('Authorization', `Bearer ${rTok}`).send(b || {});
  await D('picked-up');
  await D('arrived');
  await D('complete', { otp: '1111' });
  await D('complete', { otp: '1111' });
  const locked = await D('complete', { otp: '1111' });
  assert.equal(locked.body.code, 'otp_locked');

  // fail path still works after lock
  const f = await D('fail', { reason: 'customer not reachable' });
  assert.equal(f.status, 200);
  assert.equal(f.body.order.status, 'Failed');
  assert.equal(f.body.order.failureReason, 'customer not reachable');
  await DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { activeOrderIds: [] } });
});

test('GET /delivery/orders/:id masks phone before Out For Delivery; 403 for another order', async () => {
  const rTok = await riderToken();
  const aTok = await adminToken();
  const orderId = await assignAndAccept(rTok, aTok);

  let r = await api().get(`/api/delivery/orders/${orderId}`).set('Authorization', `Bearer ${rTok}`);
  assert.equal(r.status, 200);
  assert.match(r.body.order.customerPhone, /•/); // masked at 'Assigned'
  assert.equal(r.body.order.deliveryOtp, undefined);

  await api().post(`/api/delivery/orders/${orderId}/picked-up`).set('Authorization', `Bearer ${rTok}`);
  r = await api().get(`/api/delivery/orders/${orderId}`).set('Authorization', `Bearer ${rTok}`);
  assert.doesNotMatch(r.body.order.customerPhone, /•/); // revealed once Out For Delivery

  const other = await makeOrder();
  assert.equal((await api().get(`/api/delivery/orders/${other.orderId}`).set('Authorization', `Bearer ${rTok}`)).status, 403);
  await DeliveryPartner.updateOne({ userId: riderUserId }, { $set: { activeOrderIds: [] } });
});

test('an authenticated delivery socket joins its personal partner room', async () => {
  const token = await riderToken();
  const socket = ioClient(baseUrl, { transports: ['websocket'], auth: { token } });
  await new Promise((res, rej) => { socket.on('connect', res); socket.on('connect_error', rej); });
  await new Promise((r) => setTimeout(r, 200)); // allow server-side join

  // Server emits to the JWT-derived room; the client should receive it without
  // ever having asked to join.
  io.to('partner:' + riderUserId).emit('delivery_offer', { probe: true });

  const offer = await Promise.race([
    new Promise((resolve) => socket.on('delivery_offer', resolve)),
    new Promise((_, rej) => setTimeout(() => rej(new Error('no partner-room event within 3s')), 3000)),
  ]);
  assert.equal(offer.probe, true);
  socket.close();
});
