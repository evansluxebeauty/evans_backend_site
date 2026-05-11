import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import twilio from 'twilio';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'evans_user_secret_key_456';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
router.post('/register', async (req, res) => {
  const { username, email, mobile, password } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ mobile }, { email }] });

    if (userExists) {
      if (userExists.mobile === mobile) {
        return res.status(400).json({ message: 'User already exists with this mobile number' });
      }
      if (userExists.email === email) {
        return res.status(400).json({ message: 'User already exists with this email address' });
      }
    }

    const user = await User.create({
      username,
      email,
      mobile,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
router.post('/login', async (req, res) => {
  const { mobile, password } = req.body;

  try {
    const user = await User.findOne({ mobile });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid mobile number or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Middleware to protect user routes
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      addresses: user.addresses || [],
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// @desc    Add user address
// @route   POST /api/users/addresses
// @access  Private
router.post('/addresses', protect, async (req, res) => {
  const { name, phone, address, city, pincode, isDefault } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure addresses array exists
    if (!user.addresses) {
      user.addresses = [];
    }

    if (isDefault) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "addresses.$[].isDefault": false } }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 
        $push: { 
          addresses: { 
            name, phone, address, city, pincode, 
            isDefault: isDefault || false 
          } 
        } 
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(201).json(updatedUser.addresses);
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ 
      message: 'Server error while adding address', 
      error: error.message 
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      user.mobile = req.body.mobile || user.mobile;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
        addresses: updatedUser.addresses || [],
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Update user address
// @route   PUT /api/users/addresses/:id
// @access  Private
router.put('/addresses/:id', protect, async (req, res) => {
  const { name, phone, address, city, pincode, isDefault } = req.body;

  try {
    if (isDefault) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "addresses.$[].isDefault": false } }
      );
    }
    
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, 'addresses._id': req.params.id },
      { 
        $set: { 
          'addresses.$.name': name,
          'addresses.$.phone': phone,
          'addresses.$.address': address,
          'addresses.$.city': city,
          'addresses.$.pincode': pincode,
          'addresses.$.isDefault': isDefault !== undefined ? isDefault : false
        } 
      },
      { new: true }
    );

    if (updatedUser) {
      res.json(updatedUser.addresses);
    } else {
      res.status(404).json({ message: 'User or Address not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Delete user address
// @route   DELETE /api/users/addresses/:id
// @access  Private
router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { addresses: { _id: req.params.id } } },
      { new: true }
    );

    if (updatedUser) {
      res.json(updatedUser.addresses);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── PASSWORDS & OTP ──

// @desc    Change password (authenticated)
// @route   PUT /api/users/change-password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (user && (await user.matchPassword(currentPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(401).json({ message: 'Invalid current password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Forgot Password - Send OTP via SMS
// @route   POST /api/users/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  let { mobile } = req.body;
  if (!mobile) return res.status(400).json({ message: 'Mobile number is required' });

  // Sanitize: Remove spaces, dashes, etc.
  mobile = mobile.replace(/\s+/g, '').replace(/[-()]/g, '');

  try {
    // Find user with flexible matching (with or without +91)
    const user = await User.findOne({ 
      $or: [
        { mobile: mobile },
        { mobile: mobile.startsWith('+91') ? mobile.slice(3) : mobile },
        { mobile: mobile.startsWith('+') ? mobile : `+91${mobile}` }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this mobile number' });
    }

    // Use the actual stored mobile number for consistency
    const storedMobile = user.mobile;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Clear old OTPs and save new one
    await OTP.deleteMany({ mobile: storedMobile });
    await OTP.create({ mobile: storedMobile, otp });

    // Send OTP via Twilio SMS
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const formattedMobile = storedMobile.startsWith('+') ? storedMobile : `+91${storedMobile}`;

    await client.messages.create({
      body: `Your Evans Luxe recovery OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedMobile,
    });

    console.log(`[AUTH] OTP sent to ${formattedMobile}`);
    res.json({ message: 'OTP sent to your mobile number' });
  } catch (error) {
    console.error('[TWILIO ERROR]:', error.message);
    res.status(500).json({ message: 'Failed to send SMS. Error: ' + error.message });
  }
});


// @desc    Verify OTP
// @route   POST /api/users/verify-otp
// @access  Public
router.post('/verify-otp', async (req, res) => {
  let { mobile, otp } = req.body;
  if (!mobile || !otp) return res.status(400).json({ message: 'Mobile and OTP are required' });

  // Normalize mobile
  mobile = mobile.replace(/\s+/g, '').replace(/[-()]/g, '');

  try {
    // Find user first to get the canonical mobile number
    const user = await User.findOne({ 
      $or: [
        { mobile: mobile },
        { mobile: mobile.startsWith('+91') ? mobile.slice(3) : mobile },
        { mobile: mobile.startsWith('+') ? mobile : `+91${mobile}` }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this mobile number' });
    }

    const validOTP = await OTP.findOne({ mobile: user.mobile, otp });
    if (validOTP) {
      res.json({ message: 'OTP verified successfully', success: true });
    } else {
      res.status(400).json({ message: 'Invalid or expired OTP' });
    }
  } catch (error) {
    console.error('[VERIFY OTP ERROR]:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Reset Password with verified OTP
// @route   POST /api/users/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  let { mobile, otp, newPassword } = req.body;
  if (!mobile || !otp || !newPassword) {
    return res.status(400).json({ message: 'Mobile, OTP, and new password are required' });
  }

  // Normalize mobile
  mobile = mobile.replace(/\s+/g, '').replace(/[-()]/g, '');

  try {
    // Find user first to get the canonical mobile number
    const user = await User.findOne({ 
      $or: [
        { mobile: mobile },
        { mobile: mobile.startsWith('+91') ? mobile.slice(3) : mobile },
        { mobile: mobile.startsWith('+') ? mobile : `+91${mobile}` }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const validOTP = await OTP.findOne({ mobile: user.mobile, otp });
    if (!validOTP) {
      return res.status(400).json({ message: 'Session expired or invalid OTP. Please request a new OTP.' });
    }

    user.password = newPassword;
    // Bypass validation to avoid errors if the user profile is missing required fields like 'email'
    await user.save({ validateBeforeSave: false });
    await OTP.deleteMany({ mobile: user.mobile }); // Cleanup
    res.json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (error) {
    console.error('[RESET PASSWORD ERROR]:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
