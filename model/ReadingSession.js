import mongoose from 'mongoose';

const readingSessionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  mangaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Manga', 
    required: true 
  },
  chapterNumber: { type: Number, required: true },
  genre: { type: String }, // Stored for fast aggregation
  startTime: { type: Date, default: Date.now },
  lastHeartbeat: { type: Date, default: Date.now },
  durationMinutes: { type: Number, default: 0 },
  pagesRead: [{ type: Number }], // Tracks unique pages
  isCompleted: { type: Boolean, default: false }
}, { timestamps: true });

// Index for fast streak and analytics lookups
readingSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('ReadingSession', readingSessionSchema);