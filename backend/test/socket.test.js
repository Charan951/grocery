import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';

import { createApp } from '../app.js';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Order } from '../src/models/Order.js';
import { Otp } from '../src/models/Otp.js';

dotenv.config();

const { app, httpServer } = createApp({ logRequests: false });
const api = () => request(app);

const stamp = Date.now().toString().slice(-7);
const PHONE = `93333${stamp.slice(-5)}`;
const ADMIN_EMAIL = `qa-sock+${stamp}@freshcart.test`;
let baseUrl;

test.before(async () => {
  process.env.OTP_TEST_MODE = 'true';
  process.env.PAYMENTS_TEST_MODE = 'true';
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await User.create({ name: 'QA Sock Admin', email: ADMIN_EMAIL, password: 'admin123', role: 'Admin', status: 'Active' });
  await new Promise((res) => httpServer.listen(0, res));
  baseUrl = `http://localhost:${httpServer.address().port}`;
});

test.after(async () => {
  await Promise.allSettled([
    User.deleteOne({ email: ADMIN_EMAIL }),
    Customer.deleteMany({ phone: new RegExp(`${PHONE}$`) }),
    Order.deleteMany({ customerPhone: new RegExp(`${PHONE}$`) }),
    Otp.deleteMany({ phone: PHONE }),
  ]);
  await new Promise((res) => httpServer.close(res));
  await mongoose.disconnect();
});

test('a status change is pushed to clients in the order room', async () => {
  // customer + order
  await api().post('/api/customers/otp/send').send({ phone: PHONE });
  const v = await api().post('/api/customers/otp/verify').send({ phone: PHONE, code: '000000' });
  const cToken = v.body.token;
  const place = await api().post('/api/orders').set('Authorization', `Bearer ${cToken}`).send({
    items: [{ productId: 'p1', name: 'X', quantity: 1, price: 10 }],
    itemTotal: 10, totalAmount: 15, deliveryAddress: 'A',
  });
  const orderId = place.body.order.orderId;

  // admin token
  const login = await api().post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'admin123' });
  const sToken = login.body.token;

  // connect a socket, join the room, wait for the event
  const socket = ioClient(baseUrl, { transports: ['websocket'] });
  await new Promise((res, rej) => {
    socket.on('connect', res);
    socket.on('connect_error', rej);
  });
  socket.emit('join_order_room', orderId);
  await new Promise((r) => setTimeout(r, 150)); // let the join land

  const gotEvent = new Promise((resolve) => {
    socket.on('order_status_update', (payload) => resolve(payload));
  });

  const upd = await api().put(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${sToken}`)
    .send({ status: 'Out For Delivery', note: 'rider assigned' });
  assert.equal(upd.status, 200);

  const payload = await Promise.race([
    gotEvent,
    new Promise((_, rej) => setTimeout(() => rej(new Error('no socket event within 3s')), 3000)),
  ]);

  assert.equal(payload.orderId, orderId);
  assert.equal(payload.status, 'Out For Delivery');
  assert.ok(Array.isArray(payload.timeline));

  socket.close();
});
