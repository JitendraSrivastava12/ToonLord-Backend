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
      'REVENUE_SHARE',   // Author earning from a user's MANGA_UNLOCK
      'VIP_PURCHASE'     // ADDED: User buying a VIP Subscription
    ], 
    required: true 
  },

  currency: { 
    type: String, 
    enum: [
      'toonCoins', 
      'INR', 
      'inr',             // ADDED: Stripe often sends lowercase
      'USD', 
      'usd'              // ADDED: For global payment compatibility
    ], 
    required: true 
  },

  amount: { 
    type: Number, 
    required: true,
    min: 0
  },

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

  revenueSplitRatio: { 
    type: Number, 
    default: 70 
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
transactionSchema.index({ relatedManga: 1, type: 1 });

export default mongoose.model("Transaction", transactionSchema);