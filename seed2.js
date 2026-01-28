import express from 'express';
import mongoose from 'mongoose';
import Manga from './model/Manga.js'; 
// Ensure you also import your Chapter model if you are still re-indexing
// import Chapter from './model/Chapter.js'; 

const app = express();
const PORT = 5000;

const MONGO_URI = "mongodb+srv://jsking981_db_user:15iZRyYXNAGKZdse@cluster0.qwdhx4t.mongodb.net/ToonLordDB?appName=Cluster0";

/**
 * Updates Manga entries with 0 ratings or views to random values
 */
const updateMangaStats = async () => {
  try {
    console.log("📊 Starting Manga Stats Update...");

    // Find mangas where rating is 0 OR views are 0
    const mangasToUpdate = await Manga.find({
      $or: [{ rating: 0 }, { views: 0 }]
    });

    console.log(`Found ${mangasToUpdate.length} mangas needing stat updates.`);

    for (const manga of mangasToUpdate) {
      // Generate random rating between 3.5 and 4.9
      const randomRating = manga.rating === 0 
        ? parseFloat((Math.random() * (4.9 - 3.5) + 3.5).toFixed(1)) 
        : manga.rating;

      // Generate random views between 10,000 and 500,000
      const randomViews = manga.views === 0 
        ? Math.floor(Math.random() * (500000 - 10000) + 10000) 
        : manga.views;

      await Manga.findByIdAndUpdate(manga._id, {
        $set: { 
          rating: randomRating,
          views: randomViews 
        }
      });
    }

    console.log("✅ Manga stats updated successfully.");
  } catch (error) {
    console.error("❌ Stats Update Error:", error);
  }
};

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Database Connected");
    
    // Run your updates
    await updateMangaStats();
    
    // Optional: Keep your re-indexing logic here if needed
    // await reindexAllChapters(); 

    app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
  })
  .catch(err => console.error("❌ DB Connection Error:", err));