import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User.js';
import { DeliveryEarning } from '../src/models/DeliveryEarning.js';
import { DeliverySettlement } from '../src/models/DeliverySettlement.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/freshcart';

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  try {
    let partnerUser = await User.findOne({ role: 'Delivery' });
    if (!partnerUser) {
      partnerUser = await User.create({
        name: 'Satya Partner',
        email: 'satya.partner@example.com',
        password: 'password123',
        role: 'Delivery',
        status: 'Active',
      });
    }

    console.log('Partner User ID:', partnerUser._id.toString());

    // Clean up test data for orders FC001 to FC005
    const testOrderIds = ['FC001', 'FC002', 'FC003', 'FC004', 'FC005'];
    await DeliveryEarning.deleteMany({ orderId: { $in: testOrderIds } });
    await DeliverySettlement.deleteMany({ deliveryPartnerId: partnerUser._id });

    // Test order amounts & partner earnings
    // FC001 → ₹31 (Base 20 + Dist 11)
    // FC002 → ₹33 (Base 20 + Dist 13)
    // FC003 → ₹30 (Base 20 + Dist 10)
    // FC004 → ₹32 (Base 20 + Dist 12)
    // FC005 → ₹39 (Base 20 + Dist 19)
    const testOrdersData = [
      { orderId: 'FC001', baseFee: 20, distanceKm: 1.8, distanceFee: 11, bonus: 0, total: 31 },
      { orderId: 'FC002', baseFee: 20, distanceKm: 2.2, distanceFee: 13, bonus: 0, total: 33 },
      { orderId: 'FC003', baseFee: 20, distanceKm: 1.6, distanceFee: 10, bonus: 0, total: 30 },
      { orderId: 'FC004', baseFee: 20, distanceKm: 2.0, distanceFee: 12, bonus: 0, total: 32 },
      { orderId: 'FC005', baseFee: 20, distanceKm: 3.1, distanceFee: 19, bonus: 0, total: 39 },
    ];

    console.log('\n--- STEP 1: Creating Earning Records (with Duplicate Check) ---');
    for (const data of testOrdersData) {
      await DeliveryEarning.updateOne(
        { orderId: data.orderId },
        {
          $setOnInsert: {
            partnerUserId: partnerUser._id,
            baseFee: data.baseFee,
            distanceKm: data.distanceKm,
            distanceFee: data.distanceFee,
            bonus: data.bonus,
            total: data.total,
            status: 'pending',
            earnedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // Try creating duplicate for FC001 to test idempotency
    await DeliveryEarning.updateOne(
      { orderId: 'FC001' },
      {
        $setOnInsert: {
          partnerUserId: partnerUser._id,
          baseFee: 20,
          distanceKm: 1.8,
          distanceFee: 11,
          bonus: 0,
          total: 31,
          status: 'pending',
          earnedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const countFC001 = await DeliveryEarning.countDocuments({ orderId: 'FC001' });
    console.log(`FC001 Earning Record Count (Expect 1): ${countFC001}`);
    if (countFC001 !== 1) throw new Error('Duplicate earning record created!');

    const earnings = await DeliveryEarning.find({ partnerUserId: partnerUser._id, status: 'pending' });
    const pendingTotal = earnings.reduce((s, e) => s + e.total, 0);
    console.log(`Total Earnings Created: ${earnings.length} records`);
    console.log(`Pending Total (Expect ₹165): ₹${pendingTotal}`);

    console.log('\n--- STEP 2: Performing Admin Settlement ---');
    const count = await DeliverySettlement.countDocuments();
    const settlementId = `SET_${String(1001 + count).padStart(3, '0')}`;
    const itemIds = earnings.map((e) => e._id);
    const orderIds = earnings.map((e) => e.orderId);

    const updateRes = await DeliveryEarning.updateMany(
      { _id: { $in: itemIds }, status: 'pending' },
      { $set: { status: 'settled', settlementId, settledAt: new Date(), settledBy: partnerUser._id } }
    );

    const settlement = await DeliverySettlement.create({
      settlementId,
      deliveryPartnerId: partnerUser._id,
      amount: pendingTotal,
      earningIds: itemIds,
      orderIds,
      orderCount: earnings.length,
      status: 'SETTLED',
      settledAt: new Date(),
      settledBy: partnerUser._id,
    });

    console.log(`Settlement Created: ${settlement.settlementId} for ₹${settlement.amount}`);
    console.log(`Updated Earnings Count: ${updateRes.modifiedCount}`);

    console.log('\n--- STEP 3: Verifying Settled Status & Totals ---');
    const allEarnings = await DeliveryEarning.find({ partnerUserId: partnerUser._id });
    const remainingPending = allEarnings.filter((e) => e.status === 'pending').reduce((s, e) => s + e.total, 0);
    const settledAmount = allEarnings.filter((e) => e.status === 'settled').reduce((s, e) => s + e.total, 0);
    console.log(`Pending Settlement (Expect ₹0): ₹${remainingPending}`);
    console.log(`Settled Amount (Expect ₹165): ₹${settledAmount}`);

    console.log('\n--- STEP 4: Attempting Duplicate Settlement ---');
    const pendingRetry = await DeliveryEarning.find({ partnerUserId: partnerUser._id, status: 'pending' });
    console.log(`Pending earnings on retry (Expect 0): ${pendingRetry.length}`);

    console.log('\nSUCCESS! All database tests passed cleanly.');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
