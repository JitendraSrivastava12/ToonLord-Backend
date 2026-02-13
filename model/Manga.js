import mongoose from 'mongoose';

const MangaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String },
  artist: { type: String },
  coverImage: { type: String, required: true },
  description: { type: String, required: true },
  uploader: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'User',
  default: null // Will be populated by the script
},
  
  // Unique ID for API syncing (MangaDex UUID)
  externalId: { type: String, required: true, unique: true }, 
  
  // Logic fields for Red/Friendly mode
  isAdult: { type: Boolean, default: false }, 
  
  // Key aligned with Atlas DB
  TotalChapter: { type: Number, default: 0 }, 
  
  status: { 
    type: String, 
    enum: ['ongoing', 'completed', 'hiatus', 'cancelled'], 
    default: 'ongoing' 
  },
  
  // Numeric stats
  rating: { type: Number, default: 0, required: true },
  views: { type: Number, default: 0, required: true },
  freeChaptersCount: { type: Number, default: 3 },
  isPremium: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  // Inside your MangaSchema
premiumRequestStatus: { 
  type: String, 
  enum: ['none', 'pending', 'contract_offered', 'rejected', 'approved'], 
  default: 'none' 
},
premiumRequestCount: { 
  type: Number, 
  default: 0 
},
pendingPrice: { 
  type: Number, 
  default: 0 
}, // This stores the Admin's offer before the user accepts
contractOfferedAt: { 
  type: Date 
},currentRequestId: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'PremiumRequest',
  default: null
},
 // Optional: To track the 24-hour window
// --- NEW FIELD: Array of User IDs who subscribed ---
  subscribers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],

  tags: [String], 
  lastUpdated: { type: Date, default: Date.now }
}, { 
  collection: 'mangas',
  timestamps: false 
});

export default mongoose.model('manga', MangaSchema);