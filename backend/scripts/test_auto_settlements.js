import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User.js';
import { DeliveryEarning } from '../src/models/DeliveryEarning.js';
import { DeliverySettlement } from '../src/models/DeliverySettlement.js';
import { autoMarkEligibleEarnings } from '../src/services/settlementService.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/freshcart';

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  try {
    let partnerUser = await User.findOne({ role: 'Delivery' });
    if (!partnerUser) {
      partnerUser = await User.create({
        name: 'Auto Settle Test Partner',
        email: 'autosettle.partner@example.com',
        password: 'password123',
        role: 'Delivery',
        status: 'Active',
      });
    }

    console.log('Partner User ID:', partnerUser._id.toString());

    // Clean up test data for orders AUTO001 to AUTO003
    const testOrderIds = ['AUTO001', 'AUTO002', 'AUTO003'];
    await DeliveryEarning.deleteMany({ orderId: { $in: testOrderIds } });

    console.log('\n--- STEP 1: Creating 3 Pending Order Earnings for Today ---');
    const testOrdersData = [
      { orderId: 'AUTO001', baseFee: 20, distanceKm: 2.0, distanceFee: 12, bonus: 0, total: 32 },
      { orderId: 'AUTO002', baseFee: 20, distanceKm: 3.0, distanceFee: 18, bonus: 0, total: 38 },
      { orderId: 'AUTO003', baseFee: 20, distanceKm: 1.5, distanceFee: 9, bonus: 0, total: 29 },
    ];

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

    const pendingCountBefore = await DeliveryEarning.countDocuments({ orderId: { $in: testOrderIds }, status: 'pending' });
    console.log(`Pending Earnings created before EOD auto-settlement: ${pendingCountBefore} (Expect 3)`);

    console.log('\n--- STEP 2: Simulating 11:59 PM End-of-Day Eligibility Sweep ---');
    const result = await autoMarkEligibleEarnings();
    console.log('AutoMarkEligible Result:', result);

    console.log('\n--- STEP 3: Verifying Database Post Sweep ---');
    const pendingCountAfter = await DeliveryEarning.countDocuments({ orderId: { $in: testOrderIds }, status: 'pending' });
    const eligibleCountAfter = await DeliveryEarning.countDocuments({ orderId: { $in: testOrderIds }, status: 'eligible' });

    console.log(`Pending test earnings after sweep: ${pendingCountAfter} (Expect 0)`);
    console.log(`Eligible test earnings after sweep: ${eligibleCountAfter} (Expect 3)`);
    console.log('Note: the sweep only promotes pending -> eligible. It never creates a settlement');
    console.log('or marks earnings settled — only a successful admin-triggered payout does that.');

    if (pendingCountAfter !== 0 || eligibleCountAfter !== 3) {
      throw new Error('Eligibility sweep test failed!');
    }

    console.log('\nSUCCESS! Daily eligibility sweep verified cleanly.');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
