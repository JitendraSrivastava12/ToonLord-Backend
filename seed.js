import express from 'express';
import mongoose from 'mongoose';

const app = express();
const PORT = 5000;

// Update this URI: Add the database name after the "/" and before the "?"
const MONGO_URI = "mongodb+srv://jsking981_db_user:15iZRyYXNAGKZdse@cluster0.qwdhx4t.mongodb.net/ToonLordDB?appName=Cluster0";

import Manga from './model/Manga.js'; // Ensure the path to your Chapter model is correct

const reindexAllChapters = async () => {
  try {
    console.log("🔍 Starting Chapter Re-indexing...");

    // 1. Get a list of all unique Manga  IDs present in the Chapters collection
    const manga = await Chapter.distinct("mangaId");
    console.log(`📂 Found ${mangaIds.length} unique mangas to process.`);

    for (const mangaId of mangaIds) {
      console.log(`Processing Manga ID: ${mangaId}`);

      // 2. Fetch all chapters for this specific manga, sorted by current chapterNumber
      // We use collation to ensure "10" comes after "2" if they are strings
      const chapters = await Chapter.find({ mangaId })
        .sort({ chapterNumber: 1 })
        .collation({ locale: "en_US", numericOrdering: true });

      // 3. Update each chapter with its new index + 1
      for (let i = 0; i < chapters.length; i++) {
        const newIndex = i + 1;
        
        await Chapter.findByIdAndUpdate(chapters[i]._id, {
          $set: { chapterNumber: newIndex }
        });
      }

      console.log(`✅ Fixed ${chapters.length} chapters for Manga: ${mangaId}`);
    }

    console.log("✨ All chapters have been re-indexed successfully.");
  } catch (error) {
    console.error("❌ Re-indexing Error:", error);
  }
};

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Database Connected");
    await reindexAllChapters();
    app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
  })
  .catch(err => console.error("❌ DB Connection Error:", err));