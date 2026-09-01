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

/**
 * Builds the Express app + HTTP server + Socket.IO instance without starting to
 * listen. `index.js` wires DB + `listen()`; tests import this directly.
 */
export function createApp({ logRequests = true } = {}) {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
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
