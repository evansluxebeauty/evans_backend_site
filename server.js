import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
const allowedOrigins = [
  'https://evanscom.vercel.app',
  'https://evans-com.vercel.app',
  'https://admin-evans.vercel.app',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (normalizedOrigin.startsWith('http://localhost:')) return callback(null, true);
      if (
        normalizedOrigin.startsWith('http://192.168.') || 
        normalizedOrigin.startsWith('http://10.') || 
        normalizedOrigin.startsWith('http://172.') || 
        normalizedOrigin.startsWith('http://100.')
      ) {
        return callback(null, true);
      }
      const isAllowed = allowedOrigins.some(o => {
        const normalizedO = o.replace(/\/$/, '');
        return normalizedOrigin === normalizedO || normalizedOrigin.startsWith(normalizedO);
      });
      if (isAllowed) return callback(null, true);
      return callback(new Error('CORS Not allowed for WebSockets'));
    },
    credentials: true
  }
});

// Pass Socket.io to req middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`[WEBSOCKET] Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[WEBSOCKET] Client disconnected: ${socket.id}`);
  });
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (normalizedOrigin.startsWith('http://localhost:')) return callback(null, true);
    if (
      normalizedOrigin.startsWith('http://192.168.') || 
      normalizedOrigin.startsWith('http://10.') || 
      normalizedOrigin.startsWith('http://172.') || 
      normalizedOrigin.startsWith('http://100.')
    ) {
      return callback(null, true);
    }
    const isAllowed = allowedOrigins.some(o => {
      const normalizedO = o.replace(/\/$/, '');
      return normalizedOrigin === normalizedO || normalizedOrigin.startsWith(normalizedO);
    });
    if (isAllowed) return callback(null, true);
    console.log('CORS Blocked for origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(compression());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('Evans Backend API is running with WebSockets enabled...');
});

// API Routes
app.use('/api/products', (req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/admin')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
}, productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/settings', settingsRoutes);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode with Socket.io on port ${PORT}`);
});
