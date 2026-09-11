// One-off reconciliation: drop any orderId from a partner's activeOrderIds
// list if that order is already in a terminal status (Delivered/Failed/
// Cancelled/Returned/Refunded). Fixes partners stuck unable to go offline
// because an admin marked their order Delivered directly, bypassing the
// partner-app completion flow that normally frees them.
import 'dotenv/config';
import mongoose from 'mongoose';
import { DeliveryPartner } from '../src/models/DeliveryPartner.js';
import { Order } from '../src/models/Order.js';

const TERMINAL = ['Delivered', 'Failed', 'Cancelled', 'Returned', 'Refunded'];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const partners = await DeliveryPartner.find({ 'activeOrderIds.0': { $exists: true } });
  let fixedPartners = 0;
  let fixedOrders = 0;

  for (const p of partners) {
    const orders = await Order.find({ orderId: { $in: p.activeOrderIds } }).select('orderId status');
    const terminalIds = new Set(orders.filter((o) => TERMINAL.includes(o.status)).map((o) => o.orderId));
    if (!terminalIds.size) continue;

    const before = p.activeOrderIds.length;
    p.activeOrderIds = p.activeOrderIds.filter((id) => !terminalIds.has(id));
    p.availability = !p.isOnline
      ? 'offline'
      : (p.activeOrderIds.length >= (p.maxConcurrent || 1) ? 'busy' : 'available');
    await p.save();

    fixedPartners += 1;
    fixedOrders += before - p.activeOrderIds.length;
    console.log(`Freed partner ${p.userId}: removed ${[...terminalIds].join(', ')}`);
  }

  console.log(`Done. Fixed ${fixedPartners} partner(s), removed ${fixedOrders} stale order id(s).`);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
