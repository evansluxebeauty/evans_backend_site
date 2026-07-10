import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'store_settings'
  },
  shippingFee: {
    type: Number,
    required: true,
    default: 150
  },
  freeShippingThreshold: {
    type: Number,
    required: true,
    default: 2000
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
