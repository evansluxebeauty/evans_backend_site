import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

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

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');

    // Allow any localhost port during development
    if (normalizedOrigin.startsWith('http://localhost:')) return callback(null, true);

    const isAllowed = allowedOrigins.some(o => {
      const normalizedO = o.replace(/\/$/, '');
      return normalizedOrigin === normalizedO || normalizedOrigin.startsWith(normalizedO);
    });

    if (isAllowed) {
      return callback(null, true);
    }
    
    console.log('CORS Blocked for origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(compression());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('Evans Backend API is running...');
});

// API Routes
app.use('/api/products', (req, res, next) => {
  // Cache response for 5 minutes (300 seconds) for faster loading on the user side
  if (req.method === 'GET' && !req.path.includes('/admin')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
}, productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
