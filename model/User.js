import mongoose from "mongoose";

// 1. ACTIVITY LOG SUB-SCHEMA
const activitySchema = new mongoose.Schema({
  category: { 
    type: String, 
    default: 'system',
    enum: ['reader', 'creator', 'system'], 
    required: true 
    
  },
  type: { 
    type: String, 
    enum: [
      'Reading', 'Bookmarks', 'Favorite', 'Subscribe', 'Completed','reading',
      'comment_posted', 'reply_posted', 'rating_given',
      'manga_created', 'chapter_uploaded', 'series_updated', 'series_completed','edit_chapter',
      'received_like', 'received_comment', 'received_reply', 'received_favourite',
      'welcome', 'milestone_reached', 'coins_earned' ,'account_alert','points_earned',
      'new_follower',
      'vip_activated', 'vip_expired', 'perk_redeemed' // ADDED: VIP Notifications
    ], 
    required: true 
  },
  description: { type: String, required: true }, 
  isRead: { type: Boolean, default: false },
  mangaId: { type: mongoose.Schema.Types.ObjectId, ref: "manga" },
  chapterId: { type: mongoose.Schema.Types.ObjectId , ref:"chapter"}, 
  originator: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String },
    avatar: { type: String }
  },
  contentSnippet: { type: String }, 
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

// 2. LIBRARY SUB-SCHEMA
const libraryItemSchema = new mongoose.Schema({
  manga: { type: mongoose.Schema.Types.ObjectId, ref: "manga", required: true },
  status: { 
    type: String, 
    enum: ['Reading', 'Favorite', 'Bookmarks', 'Subscribe','Completed'], 
    default: 'Reading' 
  },
  progress: { type: Number, default: 0 }, 
  totalChapters: { type: Number, default: 0 }, 
  rating: { type: Number, min: 0, max: 10, default: 0 },
  currentchapter: { type: Number, default: 1 }, 
  lastReadAt: { type: Date, default: Date.now }
}, { _id: false });

// 3. SIMPLIFIED UNLOCKED CONTENT SCHEMA
const unlockedItemSchema = new mongoose.Schema({
  manga: { type: mongoose.Schema.Types.ObjectId, ref: "manga", required: true },
  unlockedAt: { type: Date, default: Date.now },
  amountSpent: { type: Number, default: 0 },
  method: { type: String, enum: ['coins', 'vip_credit'], default: 'coins' } // ADDED: Track if unlocked via VIP credit
}, { _id: false });

// 4. MAIN USER SCHEMA
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true }, 
  password: { type: String, required: true },
  profilePicture: { type: String, default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200" },
  bio: { type: String, default: "", maxlength: 300 },
  location: { type: String, default: "" },  
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },

  role: { 
    type: String, 
    enum: ["reader", "author", "admin"], 
    default: "reader" 
  },
  status: { 
    type: String, 
    enum: ["active", "suspended", "banned"], 
    default: "active" 
  },

  /* --- VIP SUBSCRIPTION SYSTEM (NEW) --- */
  vipStatus: {
    isVip: { type: Boolean, default: false },
    plan: { 
      type: String, 
      enum: ['none', 'monthly', 'quarterly', 'half-yearly', 'yearly'], 
      default: 'none' 
    },
    startDate: { type: Date },
    expiresAt: { type: Date },
    freeMangaCredits: { type: Number, default: 0 }, // For Annual Bonus
    stripeSubscriptionId: { type: String } // To handle cancellations
  },

  reports: { type: Number, default: 0 },
  suspensionUntil: { type: Date, default: null },

  /* --- Links --- */
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },

  /* --- Social Graph --- */
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  /* --- Content & Library --- */
  library: [libraryItemSchema], 
  unlockedContent: [unlockedItemSchema], 
  createdSeries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'manga' }],                 

  /* --- Activity & Stats --- */
  activityLog: [activitySchema], 
  stats: {
    totalChaptersRead: { type: Number, default: 0 },
    seriesCompleted: { type: Number, default: 0 },
    daysStreak: { type: Number, default: 1 }
  },
  
  authorRequestPending: { type: Boolean, default: false }

}, { timestamps: true });

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ "vipStatus.isVip": 1 }); // ADDED: Speed up premium feature checks
userSchema.index({ "vipStatus.expiresAt": 1 }); // ADDED: For cleanup cron jobs
userSchema.index({ "unlockedContent.manga": 1 }); 

export default mongoose.model("User", userSchema);