// models/ReadingLog.js
import mongoose from 'mongoose';

const ReadingLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  mangaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Manga', 
    required: true 
  },
  chapterNumber: { 
    type: Number 
  },
  genre: { 
    type: String // Useful for the "Favorite Genres" Pie Chart
  },
  durationMinutes: { 
    type: Number, 
    default: 15 // Estimated time per chapter if not tracked live
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create an index to make analytics queries faster
ReadingLogSchema.index({ userId: 1, createdAt: -1 });

const ReadingLog = mongoose.model('ReadingLog', ReadingLogSchema);

export default ReadingLog;