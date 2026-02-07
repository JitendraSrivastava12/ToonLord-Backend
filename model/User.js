import mongoose from "mongoose";

// 1. ACTIVITY LOG SUB-SCHEMA
// Powers the vertical "Activity Bar" on your dashboard
const activitySchema = new mongoose.Schema({
  category: { 
    type: String, 
    enum: ['reader', 'creator', 'system'], 
    required: true 
  },
  type: { 
    type: String, 
    enum: [
      // --- READER ACTIONS ---
      'Reading', 'Bookmarks', 'Favorite', 'Subscribe', // Added 'Subscribe'
      'comment_posted', 'reply_posted', 'rating_given',
      
      // --- CREATOR ACTIONS ---
      'manga_created', 'chapter_uploaded', 'series_updated', 'series_completed','edit_chapter',
      
      // --- CREATOR NOTIFICATIONS (Social) ---
      'received_like', 'received_comment', 'received_reply', 'received_favourite',
      
      // --- SYSTEM & GROWTH ---
      'welcome', 'milestone_reached', 'points_earned' 
    ], 
    required: true 
  },
  
  description: { type: String, required: true }, 
  isRead: { type: Boolean, default: false },

  // References for Navigation
  mangaId: { type: mongoose.Schema.Types.ObjectId, ref: "manga" },
  chapterId: { type: mongoose.Schema.Types.ObjectId , ref:"chapter"}, 
  
  // Social Context
  originator: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String },
    avatar: { type: String }
  },

  contentSnippet: { type: String }, 
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

// 2. LIBRARY SUB-SCHEMA
// Powers your LibraryPage tabs
const libraryItemSchema = new mongoose.Schema({
  manga: { type: mongoose.Schema.Types.ObjectId, ref: "manga", required: true },
  status: { 
    type: String, 
    enum: ['Reading', 'Favorite', 'Bookmarks', 'Subscribe'], // Added 'Subscribe'
    default: 'Reading' 
  },
  progress: { type: Number, default: 0 }, 
  totalChapters: { type: Number, default: 0 }, 
  rating: { type: Number, min: 0, max: 10, default: 0 },
  currentchapter: { type: Number, default: 1 }, // Added to match your controller logic
  lastReadAt: { type: Date, default: Date.now }
}, { _id: false });

// 3. UNLOCKED CONTENT SCHEMA
const unlockedMangaSchema = new mongoose.Schema({
  manga: { type: mongoose.Schema.Types.ObjectId, ref: "manga", required: true },
  unlockedAt: { type: Date, default: Date.now },
  pointsSpent: { type: Number, default: 0 }
}, { _id: false });

// 4. MAIN USER SCHEMA
const userSchema = new mongoose.Schema({
  /* --- Profile Info --- */
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true }, 
  password: { type: String, required: true },
  profilePicture: { type: String, default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200" },
  bio: { type: String, default: "", maxlength: 300 },
  location: { type: String, default: "" },  

  /* --- Role & Economy --- */
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
  reports: { 
    type: Number, 
    default: 0 // Tracks total number of reports against this user
  },
  suspensionUntil: { 
    type: Date, 
    default: null // For temporary locks
  },
  points: { type: Number, default: 100 }, 

  /* --- Content & Library --- */
  library: [libraryItemSchema], 
  unlockedContent: [unlockedMangaSchema],
  createdSeries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'manga' }],              

  /* --- Activity & Stats --- */
  activityLog: [activitySchema], 
  stats: {
    totalChaptersRead: { type: Number, default: 0 },
    seriesCompleted: { type: Number, default: 0 },
    daysStreak: { type: Number, default: 1 }
  }
}, { timestamps: true });

/* --- Indexing --- */
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ "library.status": 1 }); 

export default mongoose.model("User", userSchema);