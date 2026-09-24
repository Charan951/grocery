// Payout provider abstraction for delivery-partner settlements.
//
// TEST/MOCK: no real Razorpay/RazorpayX (or any bank/UPI) integration is
// configured yet. This simulates a payout call so the settlement lifecycle
// (PENDING -> PROCESSING -> SUCCESS/FAILED) is real, but no money actually
// moves. Swap `mockPayout` for a real RazorpayX/Cashfree call when payout
// credentials are available — the caller (settlementService) only depends on
// the { success, reference, failureReason } shape returned here.

const mockPayout = async ({ settlementId, amount }) => {
  // Simulated latency + deterministic outcome so failures are exercisable in
  // tests without being flaky in the common case.
  await new Promise((r) => setTimeout(r, 50));
  if (!amount || amount <= 0) {
    return { success: false, failureReason: 'Invalid payout amount' };
  }
  // Test-only seam: lets the test suite exercise the FAILED payout path
  // deterministically without touching the admin API surface.
  if (process.env.PAYOUT_MOCK_FORCE_FAIL === 'true') {
    return { success: false, failureReason: 'Simulated payout provider failure (TEST/MOCK)' };
  }
  return {
    success: true,
    reference: `MOCK_PAYOUT_${settlementId}_${Date.now()}`,
  };
};

export const payoutService = {
  // Returns { success: true, reference } or { success: false, failureReason }.
  // Never throws — a provider-side failure is a normal FAILED outcome, not
  // an exception the caller needs to catch.
  process: async ({ settlementId, amount }) => {
    try {
      return await mockPayout({ settlementId, amount });
    } catch (err) {
      return { success: false, failureReason: err.message || 'Payout provider error' };
    }
  },
};
