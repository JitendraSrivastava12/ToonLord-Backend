import mongoose from "mongoose";

// 1. ACTIVITY LOG SUB-SCHEMA
// Powers the vertical "Activity Bar" on your dashboard
const activitySchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['reading', 'unlock', 'achievement', 'points', 'bookmark'], 
    required: true 
  },
  description: { type: String, required: true }, // e.g., "Reached Chapter 150"
  mangaTitle: { type: String }, // Storing title directly for quick display
  link: { type: String }, // URL to the specific chapter/manga
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

// 2. LIBRARY SUB-SCHEMA
// Powers your LibraryPage tabs (Reading, Completed, etc.)
const libraryItemSchema = new mongoose.Schema({
  manga: { type: mongoose.Schema.Types.ObjectId, ref: "manga", required: true },
  status: { 
    type: String, 
    enum: ['Reading', 'Plan to Read', 'Completed', 'Dropped', 'On Hold'], 
    default: 'Reading' 
  },
  progress: { type: Number, default: 0 }, 
  totalChapters: { type: Number, default: 0 }, // Useful for the % bar calculation
  rating: { type: Number, min: 0, max: 10, default: 0 },
  isFavorite: { type: Boolean, default: false },
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
  role: { type: String, enum: ["reader", "author", "admin"], default: "reader" },
  points: { type: Number, default: 100 }, 

  /* --- Content & Library --- */
  library: [libraryItemSchema],         // The "Heart" of the Library Page
  unlockedContent: [unlockedMangaSchema],
  createdSeries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'manga' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "manga" }],

  /* --- Activity & Stats --- */
  activityLog: [activitySchema],        // The Dashboard Activity Bar data
  stats: {
    totalChaptersRead: { type: Number, default: 0 },
    seriesCompleted: { type: Number, default: 0 },
    daysStreak: { type: Number, default: 1 }
  }
}, { timestamps: true });

/* --- Indexing --- */
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ "library.status": 1 }); // High speed filtering for Library tabs

export default mongoose.model("User", userSchema);