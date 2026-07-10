import express from 'express';
import Settings from '../models/Settings.js';
import { protectAdmin } from '../routes/authRoutes.js'; // Assuming authRoutes exports protectAdmin or I can recreate it

const router = express.Router();

// @route   GET /api/settings
// @desc    Get store settings
// @access  Public
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'store_settings' });
    if (!settings) {
      // Create default if not exists
      settings = await Settings.create({ key: 'store_settings', shippingFee: 150, freeShippingThreshold: 2000 });
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/settings
// @desc    Update store settings
// @access  Private/Admin
router.put('/', protectAdmin, async (req, res) => {
  try {
    const { shippingFee, freeShippingThreshold } = req.body;

    let settings = await Settings.findOne({ key: 'store_settings' });
    
    if (!settings) {
      settings = new Settings({ key: 'store_settings' });
    }

    settings.shippingFee = shippingFee !== undefined ? shippingFee : settings.shippingFee;
    settings.freeShippingThreshold = freeShippingThreshold !== undefined ? freeShippingThreshold : settings.freeShippingThreshold;

    await settings.save();
    
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
