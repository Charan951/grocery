import dotenv from 'dotenv';

import { createApp } from './app.js';
import { connectDB } from './src/config/db.js';
import { seedDatabase } from './src/config/seed.js';
import { expireStaleOffers } from './src/services/assignmentService.js';

// Load config variables
dotenv.config();

const { httpServer } = createApp();

// Connect database and seed initial configurations
connectDB().then((conn) => {
  if (conn) {
    seedDatabase();
  }
});

// Dispatch: expire stale delivery offers and re-flag / re-offer.
const sweeper = setInterval(() => {
  expireStaleOffers().catch(() => {});
}, 15000);
sweeper.unref?.();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 FreshCart MERN Server listening on http://localhost:${PORT}`);
});

