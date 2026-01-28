import mongoose from 'mongoose';

const MangaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String }, // Added to match your data
  coverImage: { type: String, required: true },
  description: { type: String, required: true },
  
  // Unique ID for API syncing (MangaDex UUID)
  externalId: { type: String, required: true, unique: true }, 
  
  // Logic fields for Red/Friendly mode
  isAdult: { type: Boolean, default: false }, 
  
  // UPDATED: Renamed from chapterCount to match your Atlas DB key
  TotalChapter: { type: Number, default: 0 }, 
  
  status: { 
    type: String, 
    // Kept lowercase to match your "ongoing" data exactly
    enum: ['ongoing', 'completed', 'hiatus', 'cancelled'], 
    default: 'ongoing' 
  },
  
  // Numeric stats
  rating: { type: Number, default: 0, required: true },
  views: { type: Number, default: 0, required: true },
  
  tags: [String], // Array of strings (e.g., ["Romance", "Drama"])
  lastUpdated: { type: Date, default: Date.now }
}, { 
  // Forces Mongoose to use your existing 'mangas' collection
  collection: 'mangas',
  timestamps: false // We are managing lastUpdated manually
});

export default mongoose.model('manga', MangaSchema);