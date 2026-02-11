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
    enum: ['toonCoins', 'INR'], // Removed 'Points' and 'USD' to stay focused on your specific setup
    required: true 
  },

  // The numeric value of the transaction
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },

  // 'in' for adding to balance, 'out' for deducting from balance
  direction: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },

  description: { 
    type: String, 
    required: true 
  },

  // Contextual Links
  relatedManga: { type: mongoose.Schema.Types.ObjectId, ref: "manga" },
  // Removed relatedChapter since you are doing full manga unlocks only
  
  // If REVENUE_SHARE, this is the Author. If COIN_PURCHASE, this is the System.
  beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // For Stripe, Razorpay, or external payment gateway IDs
  externalTransactionId: { type: String, default: null },

  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'reversed'], 
    default: 'completed' 
  }
}, { timestamps: true });
transactionSchema.index({ userId: 1, createdAt: -1 });
// Optimizing for Creator Dashboard
transactionSchema.index({ beneficiaryId: 1, type: 1, createdAt: -1 });

export default mongoose.model("Transaction", transactionSchema);