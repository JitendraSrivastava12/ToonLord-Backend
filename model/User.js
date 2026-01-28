import mongoose from "mongoose";

// Sub-schema for tracking manga unlocked with points
const unlockedMangaSchema = new mongoose.Schema({
  manga: { type: mongoose.Schema.Types.ObjectId, ref: "Manga", required: true },
  unlockedAt: { type: Date, default: Date.now },
  pointsSpent: { type: Number, default: 0 }
}, { _id: false });

// Sub-schema for reading progress
const readingHistorySchema = new mongoose.Schema({
  manga: { type: mongoose.Schema.Types.ObjectId, ref: "Manga", required: true },
  lastReadChapter: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  /* --- Profile Info (Matches React Inputs) --- */
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true }, 
  password: { type: String, required: true },
  profilePicture: { type: String, default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200" },
  bio: { type: String, default: "", maxlength: 300 },
  location: { type: String, default: "" },  

  /* --- Role & Economy --- */
  role: { type: String, enum: ["reader", "author", "admin"], default: "reader" },
  points: { type: Number, default: 100 }, // Welcome bonus

  /* --- Content Tracking --- */
  unlockedContent: [unlockedMangaSchema],
  uploads: [{ type: mongoose.Schema.Types.ObjectId, ref: "Manga" }],
  history: [readingHistorySchema],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Manga" }]
}, { timestamps: true });

// Indexing for high-speed login lookups
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

export default mongoose.model("User", userSchema);