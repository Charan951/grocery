import dotenv from 'dotenv';

import { createApp } from './app.js';
import { connectDB } from './src/config/db.js';
import { seedDatabase } from './src/config/seed.js';
import { expireStaleOffers } from './src/services/assignmentService.js';

// Load config variables
dotenv.config();

// Fail loud (but don't crash the demo) if critical secrets are missing — there
// are no hardcoded fallbacks in source any more.
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`⚠️  Missing required environment variables: ${missingEnv.join(', ')}. ` +
    `Auth and/or the database will not work until these are set (see backend/.env.example).`);
}

const { httpServer } = createApp();

// Connect database and seed initial configurations
connectDB().then((conn) => {
  if (conn) {
    seedDatabase();
  } else {
    console.log('ℹ️ Server proceeding without active DB connection.');
  }
});

// Dispatch: expire stale delivery offers and re-flag / re-offer.
const sweeper = setInterval(() => {
  expireStaleOffers().catch((e) => console.warn('offer sweeper:', e.message));
}, 15000);
sweeper.unref?.();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 FreshCart MERN Server listening on http://localhost:${PORT}`);
});
