import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  
  type: { 
    type: String, 
    enum: [
      'COIN_PURCHASE',   // Buying toonCoins with real money
      'AD_REWARD',       // Earning toonCoins from ads/tasks
      'MANGA_UNLOCK',    // Spending toonCoins on a full manga
      'REFUND',          // System correction
      'CREATOR_PAYOUT',  // Author withdrawing real money (INR)
      'REVENUE_SHARE'    // Author earning from a user's MANGA_UNLOCK
    ], 
    required: true 
  },

  currency: { 
    type: String, 
    enum: ['toonCoins', 'INR'], 
    required: true 
  },

  amount: { 
    type: Number, 
    required: true,
    min: 0
  },

  // Added for clear split tracking in REVENUE_SHARE
  platformFee: { type: Number, default: 0 }, 
  netEarning: { type: Number, default: 0 },

  direction: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },

  description: { 
    type: String, 
    required: true 
  },
   // Add this inside transactionSchema
revenueSplitRatio: { 
  type: Number, 
  default: 70 // e.g., 70 represents 70% to the creator
},
  relatedManga: { type: mongoose.Schema.Types.ObjectId, ref: "manga" },
  
  beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  externalTransactionId: { type: String, default: null },

  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'reversed'], 
    default: 'completed' 
  }
}, { timestamps: true });

// INDEXES
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ beneficiaryId: 1, type: 1, createdAt: -1 });
// Added index for revenue reports
transactionSchema.index({ relatedManga: 1, type: 1 });

export default mongoose.model("Transaction", transactionSchema);