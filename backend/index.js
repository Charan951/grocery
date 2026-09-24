import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { createApp } from './app.js';
import { connectDB } from './src/config/db.js';
import { seedDatabase } from './src/config/seed.js';
import { expireStaleOffers } from './src/services/assignmentService.js';
import { autoMarkEligibleEarnings } from './src/services/settlementService.js';
import { expireStaleReturnOffers, processDueRefunds } from './src/services/returnService.js';

// Load config variables
dotenv.config();

const { httpServer } = createApp();

async function startServer() {
  // Connect database and seed initial configurations
  const conn = await connectDB();
  if (conn) {
    seedDatabase().catch(() => {});
  }

  // Dispatch: expire stale delivery offers and re-flag / re-offer.
  const sweeper = setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      expireStaleOffers().catch(() => {});
      expireStaleReturnOffers().catch(() => {});
    }
  }, 15000);
  sweeper.unref?.();

  // Dispatch: mark the day's partner earnings ELIGIBLE for admin settlement
  // before day ends (23:59 IST). This never pays anyone or marks anything
  // SETTLED — only a successful admin-triggered payout does that.
  const IST_OFFSET = 5.5 * 3600000;
  let lastSettlementCheckDay = null;

  const settlementSweeper = setInterval(() => {
    if (mongoose.connection.readyState !== 1) return;
    const nowIst = new Date(Date.now() + IST_OFFSET);
    const hour = nowIst.getUTCHours();
    const minute = nowIst.getUTCMinutes();
    const todayStr = nowIst.toISOString().slice(0, 10);

    // Trigger at 23:59 IST or on new day rollover
    if (hour === 23 && minute >= 58) {
      if (lastSettlementCheckDay !== todayStr) {
        lastSettlementCheckDay = todayStr;
        autoMarkEligibleEarnings().catch(() => {});
      }
    }
  }, 30000);
  settlementSweeper.unref?.();

  // Returns: transfer refunds whose post-pickup delay (default 24h) has elapsed.
  const refundSweeper = setInterval(() => {
    if (mongoose.connection.readyState === 1) processDueRefunds().catch(() => {});
  }, 60000);
  refundSweeper.unref?.();

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 FreshCart MERN Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => console.error('Failed to start server:', err));

