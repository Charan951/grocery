import mongoose from 'mongoose';
import { DeliveryEarning } from '../models/DeliveryEarning.js';
import { DeliverySettlement } from '../models/DeliverySettlement.js';
import { User } from '../models/User.js';

/**
 * Automatically settles pending partner earnings.
 * Can settle all pending earnings, or only earnings earned before a specific date (e.g., previous day).
 */
export async function autoSettlePendingEarnings(options = {}) {
  try {
    const { onlyBeforeDate = null } = options;
    const filter = { status: 'pending' };
    if (onlyBeforeDate) {
      filter.earnedAt = { $lt: onlyBeforeDate };
    }

    const pendingItems = await DeliveryEarning.find(filter).lean();
    if (!pendingItems || pendingItems.length === 0) {
      return { settledCount: 0, settlementsCreated: 0 };
    }

    // Group earnings by partnerUserId
    const partnerGroups = {};
    for (const item of pendingItems) {
      const pid = item.partnerUserId.toString();
      if (!partnerGroups[pid]) partnerGroups[pid] = [];
      partnerGroups[pid].push(item);
    }

    let settlementsCreated = 0;
    let totalEarningsSettled = 0;

    for (const [partnerUserId, items] of Object.entries(partnerGroups)) {
      const amount = items.reduce((sum, i) => sum + (i.total || 0), 0);
      if (amount <= 0) continue;

      const count = await DeliverySettlement.countDocuments();
      const settlementId = `SET_${String(1001 + count).padStart(3, '0')}`;
      const now = new Date();
      const itemIds = items.map((i) => i._id);
      const orderIds = items.map((i) => i.orderId);

      const updateRes = await DeliveryEarning.updateMany(
        { _id: { $in: itemIds }, status: 'pending' },
        { $set: { status: 'settled', settlementId, settledAt: now } }
      );

      const actualSettledCount = updateRes.modifiedCount ?? updateRes.nModified ?? 0;
      if (actualSettledCount > 0) {
        await DeliverySettlement.create({
          settlementId,
          deliveryPartnerId: partnerUserId,
          amount,
          earningIds: itemIds,
          orderIds,
          orderCount: items.length,
          status: 'SETTLED',
          settledAt: now,
          settledBy: partnerUserId, // auto-settled system/partner
        });
        settlementsCreated++;
        totalEarningsSettled += actualSettledCount;
      }
    }

    if (settlementsCreated > 0) {
      console.log(`⚡ [AutoSettlement] Automatically settled ${totalEarningsSettled} earnings across ${settlementsCreated} partner(s).`);
    }

    return { settledCount: totalEarningsSettled, settlementsCreated };
  } catch (err) {
    console.error('❌ Error in autoSettlePendingEarnings:', err.message);
    return { error: err.message };
  }
}
