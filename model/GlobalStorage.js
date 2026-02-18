import mongoose from 'mongoose';

const GlobalSettingSchema = new mongoose.Schema({
  // Use a unique key like 'red_mode_disabled' to identify the setting
  key: { 
    type: String, 
    required: true, 
    unique: true 
  },
  // The actual value (true = hidden, false = visible)
  value: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

const GlobalSetting = mongoose.model('GlobalSetting', GlobalSettingSchema);

export default GlobalSetting;