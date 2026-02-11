import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true 
  },
  
  toonCoins: { 
    type: Number, 
    default: 10,
    min: 0 
  },

  creatorEarnings: {
    pendingBalance: { type: Number, default: 0 }, 
    withdrawableBalance: { type: Number, default: 0 }, 
    totalLifeTimeEarnings: { type: Number, default: 0 }
  },

  lastTransactionAt: { 
    type: Date, 
    default: Date.now 
  },
  
  isLocked: { 
    type: Boolean, 
    default: false 
  } 
}, { timestamps: true });

// Corrected Middleware: Removed 'next' to prevent the TypeError
walletSchema.pre('save', function() {
  if (this.isModified('toonCoins')) {
    this.lastTransactionAt = Date.now();
  }
});

export default mongoose.model("Wallet", walletSchema);