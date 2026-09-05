import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const router = express.Router();

// JWT Secret (Usually stored in .env, using fallback here)
const JWT_SECRET = process.env.JWT_SECRET || 'evans_super_secret_key_123';

// @desc    Auth Admin & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });

    // Simplistic password check for the temporary hardcoded seeded admin
    // In production, we would use bcrypt.compareSync
    if (admin && admin.password === password) {
      const token = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET, {
        expiresIn: '30d',
      });

      res.json({
        _id: admin._id,
        email: admin.email,
        token,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Errror', error: error.message });
  }
});

// Middleware function to protect routes
export const protectAdmin = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.role === 'admin') {
        return next();
      } else {
        return res.status(401).json({ message: 'Not authorized as an admin' });
      }
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// @desc    Update admin profile & password
// @route   PUT /api/auth/profile
// @access  Private (Admin)
router.put('/profile', protectAdmin, async (req, res) => {
  const { email, password, currentPassword } = req.body;
  
  try {
    let admin = await Admin.findOne({});
    if (!admin) {
      admin = new Admin({ email: email || 'admin@evansluxe.com', password: password || 'admin123' });
    } else {
      if (password && currentPassword && admin.password !== currentPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      if (email) admin.email = email;
      if (password) admin.password = password;
    }

    const updatedAdmin = await admin.save();
    res.json({
      _id: updatedAdmin._id,
      email: updatedAdmin.email,
      message: 'Security settings updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
