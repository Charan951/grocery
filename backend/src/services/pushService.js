import fs from 'fs';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { DeviceToken } from '../models/DeviceToken.js';

// FCM is optional. It activates from (in order): FIREBASE_SERVICE_ACCOUNT
// (raw JSON or base64), GOOGLE_APPLICATION_CREDENTIALS, or a local
// src/config/service_account.json|js file (git-ignored). Without any of these
// every send is a silent no-op so the rest of dispatch keeps working.
let _app = null;
let _warned = false;

const localKeyPath = () => {
  for (const name of ['service_account.json', 'service_account.js']) {
    const p = fileURLToPath(new URL(`../config/${name}`, import.meta.url));
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const init = () => {
  if (_app !== null) return _app;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    const keyFile = localKeyPath();
    let credential;
    if (raw) {
      const json = raw.trim().startsWith('{')
        ? raw
        : Buffer.from(raw, 'base64').toString('utf8');
      credential = admin.credential.cert(JSON.parse(json));
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
    } else if (keyFile) {
      credential = admin.credential.cert(JSON.parse(fs.readFileSync(keyFile, 'utf8')));
    } else {
      _app = false;
      return _app;
    }
    _app = admin.apps.length ? admin.app() : admin.initializeApp({ credential });
    return _app;
  } catch (err) {
    if (!_warned) {
      console.warn('[push] FCM disabled — bad FIREBASE_SERVICE_ACCOUNT:', err.message);
      _warned = true;
    }
    _app = false;
    return _app;
  }
};

export const isPushConfigured = () => init() !== false;

/** Register (idempotent) a device token for a partner or customer. */
export const registerDeviceToken = async ({ ownerType, ownerId, token, platform }) => {
  if (!token) return null;
  return DeviceToken.findOneAndUpdate(
    { token },
    { $set: { ownerType, ownerId: String(ownerId), platform: platform || 'android' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const removeDeviceToken = (token) => DeviceToken.deleteOne({ token });

/**
 * Send a data+notification message to every device of an owner.
 * Returns { skipped } when FCM isn't configured; prunes dead tokens otherwise.
 */
export const sendToOwner = async (ownerId, { title, body, data = {} }) => {
  const app = init();
  if (app === false) return { skipped: true, sent: 0 };

  const rows = await DeviceToken.find({ ownerId: String(ownerId) }).select('token').lean();
  const tokens = rows.map((r) => r.token);
  if (!tokens.length) return { skipped: false, sent: 0 };

  const message = {
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: { priority: 'high' },
    apns: { headers: { 'apns-priority': '10' } },
  };

  try {
    const res = await admin.messaging().sendEachForMulticast(message);
    const dead = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code || '';
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        dead.push(tokens[i]);
      }
    });
    if (dead.length) await DeviceToken.deleteMany({ token: { $in: dead } });
    return { skipped: false, sent: res.successCount, pruned: dead.length };
  } catch (err) {
    console.warn('[push] send failed:', err.message);
    return { skipped: false, sent: 0, error: err.message };
  }
};
