import { DeliveryEarning } from '../models/DeliveryEarning.js';
import { DeliverySettlement } from '../models/DeliverySettlement.js';
import { payoutService } from './payoutService.js';

const nextSettlementId = async () => {
  const count = await DeliverySettlement.countDocuments();
  return `SET_${String(1001 + count).padStart(3, '0')}`;
};

/**
 * Promotes pending earnings to ELIGIBLE so they can be picked up in an admin
 * settlement. This does NOT pay anyone or touch the settlement/payout flow —
 * it only flips DeliveryEarning.status: pending -> eligible.
 */
export async function autoMarkEligibleEarnings(options = {}) {
  try {
    const { onlyBeforeDate = null } = options;
    const filter = { status: 'pending' };
    if (onlyBeforeDate) filter.earnedAt = { $lt: onlyBeforeDate };

    const now = new Date();
    const res = await DeliveryEarning.updateMany(filter, { $set: { status: 'eligible', eligibleAt: now } });
    const modified = res.modifiedCount ?? res.nModified ?? 0;
    if (modified > 0) console.log(`⚡ [Earnings] Marked ${modified} earning(s) eligible for settlement.`);
    return { markedEligible: modified };
  } catch (err) {
    console.error('❌ Error in autoMarkEligibleEarnings:', err.message);
    return { error: err.message };
  }
}

/**
 * Creates a settlement for the given ELIGIBLE earnings and immediately runs
 * it through the payout provider. Earnings are only ever flipped to SETTLED
 * once the payout actually reports success; a failed payout leaves them
 * ELIGIBLE (never SETTLED, never lost) so the settlement can be retried.
 *
 * `earningItems` must be plain docs/leans with status === 'eligible'.
 */
export async function createAndProcessSettlement({ partnerUserId, earningItems, settledBy }) {
  const itemIds = earningItems.map((e) => e._id);
  const orderIds = earningItems.map((e) => e.orderId);
  const amount = earningItems.reduce((s, e) => s + (e.total || 0), 0);

  if (amount <= 0) throw new Error('Settlement amount must be greater than zero');

  const settlementId = await nextSettlementId();
  const settlement = await DeliverySettlement.create({
    settlementId,
    deliveryPartnerId: partnerUserId,
    amount,
    earningIds: itemIds,
    orderIds,
    orderCount: earningItems.length,
    status: 'PENDING',
    settledBy,
  });

  settlement.status = 'PROCESSING';
  await settlement.save();

  const result = await payoutService.process({ settlementId, amount });
  const now = new Date();

  if (result.success) {
    settlement.status = 'SUCCESS';
    settlement.paymentReference = result.reference;
    settlement.processedAt = now;
    settlement.settledAt = now;
    await settlement.save();

    await DeliveryEarning.updateMany(
      { _id: { $in: itemIds }, status: 'eligible' },
      { $set: { status: 'settled', settlementId, settledAt: now, settledBy } }
    );
  } else {
    settlement.status = 'FAILED';
    settlement.failureReason = result.failureReason || 'Payout failed';
    settlement.processedAt = now;
    await settlement.save();
    // Earnings intentionally left ELIGIBLE — nothing is lost, admin can retry.
  }

  return settlement;
}
