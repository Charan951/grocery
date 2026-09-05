import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import jwt from 'jsonwebtoken';

import apiRouter from './src/routes/api.js';
import { User } from './src/models/User.js';
import { setIo as setAssignmentIo } from './src/services/assignmentService.js';

// Native apps (the Flutter customer/delivery apps via Dio, curl, Postman,
// server-to-server calls) don't send an `Origin` header at all, so they are
// never subject to CORS — this allowlist only matters for browser callers
// (the web storefront + admin console, and anyone testing the API from a
// browser at a LAN IP). Configure via CORS_ORIGINS in .env (comma-separated,
// e.g. "https://app.freshcart.com,https://admin.freshcart.com"); every
// localhost/127.0.0.1 port and any private LAN IP (192.168.x.x / 10.x.x.x /
// 172.16-31.x.x, any port) are always allowed so a phone browser or a
// teammate's machine on the same network can hit a dev server without
// editing this list each time.
const LAN_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function buildCorsOptions() {
  const configured = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // No Origin header at all → not a browser request (native app / curl /
      // server-to-server). Always allow.
      if (!origin) return callback(null, true);
      if (LAN_ORIGIN_RE.test(origin)) return callback(null, true);
      if (configured.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
  };
}

/**
 * Builds the Express app + HTTP server + Socket.IO instance without starting to
 * listen. `index.js` wires DB + `listen()`; tests import this directly.
 */
export function createApp({ logRequests = true } = {}) {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: buildCorsOptions()
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(buildCorsOptions()));
  if (logRequests) app.use(morgan('dev'));
  // Razorpay webhook needs the raw body for signature verification — must run
  // before the JSON body parser.
  app.use('/api/payment/webhook', express.raw({ type: '*/*', limit: '1mb' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(mongoSanitize());

  // Make io reachable from controllers (used by the order status pipeline).
  app.set('io', io);
  setAssignmentIo(io);

  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: 'FreshCart Enterprise API Engine is running.',
      version: '1.0.0'
    });
  });

  app.use('/api', apiRouter);

  io.on('connection', async (socket) => {
    socket.on('join_order_room', (orderId) => orderId && socket.join(String(orderId)));
    socket.on('leave_order_room', (orderId) => orderId && socket.leave(String(orderId)));
    socket.on('support_message_send', (data) => io.emit('support_message_received', data));

    // Authenticated rooms: a delivery partner joins their personal offer room;
    // Admin/Manager join the fleet room. Room names are NEVER taken from the
    // client for these — only derived from a verified JWT.
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(String(token), process.env.JWT_SECRET);
        if (decoded && decoded.type !== 'customer') {
          const user = await User.findById(decoded.id).select('role status');
          if (user && user.status === 'Active') {
            if (user.role === 'Delivery') socket.join('partner:' + String(user._id));
            if (user.role === 'Admin' || user.role === 'Manager') socket.join('admin_fleet');
          }
        }
      } catch (_) { /* anonymous socket */ }
    }
  });

  app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.message);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  });

  return { app, httpServer, io };
}
