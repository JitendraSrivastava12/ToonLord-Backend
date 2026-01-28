import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
  mangaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true },
  chapterNumber: Number,
  title: String,
  hash: String, 
  pages: [String], 
  externalId: { type: String, unique: true }
}, { timestamps: true });

export default mongoose.model('chapter', chapterSchema);