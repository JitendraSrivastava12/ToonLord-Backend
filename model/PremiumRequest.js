import mongoose from 'mongoose';

const premiumRequestSchema = new mongoose.Schema({
  manga: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'manga', 
    required: true 
  },
  creator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'contract_offered', 'rejected', 'approved', 'cancelled'], 
    default: 'pending' 
  },
  // Snapshot of stats at the time they clicked "Request"
  // This helps you see if they grew since the last time they asked
  statsAtRequest: {
    views: { type: Number, default: 0 },
    chapters: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
  },
  adminOffer: {
    price: { type: Number, default: 0 },
    note: { type: String, default: "" },
    offeredAt: { type: Date }
  },
  userAction: {
    acceptedAt: { type: Date },
    rejectedAt: { type: Date }
  }
}, { timestamps: true });

// Indexing for the Admin Queue
premiumRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('PremiumRequest', premiumRequestSchema);