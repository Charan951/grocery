import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';

import { connectDB } from './src/config/db.js';
import { seedDatabase } from './src/config/seed.js';
import apiRouter from './src/routes/api.js';

// Load config variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all client links for pairing / testing
    methods: ['GET', 'POST']
  }
});

// Middleware security packages
app.use(helmet({
  contentSecurityPolicy: false // Allow embedding visual images & maps
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(mongoSanitize());

// Connect database and seed initial configurations
connectDB().then((conn) => {
  if (conn) {
    seedDatabase();
  } else {
    console.log('ℹ️ Server proceeding without active DB connection.');
  }
});

// Root check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'FreshCart Enterprise API Engine is running.',
    version: '1.0.0'
  });
});

// Mount Routes
app.use('/api', apiRouter);

// WebSocket event triggers
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // Room placement for orders tracking
  socket.on('join_order_room', (orderId) => {
    socket.join(orderId);
    console.log(`Socket joined order status room: ${orderId}`);
  });

  // Support chat event triggers
  socket.on('support_message_send', (data) => {
    // Broadcast message to admins or specific rooms
    io.emit('support_message_received', data);
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 FreshCart MERN Server listening on http://localhost:${PORT}`);
});
