import express from 'express';
import mongoose from 'mongoose';
import Manga from './model/Manga.js'; 

const app = express();
const PORT = 5000;

const MONGO_URI = "mongodb+srv://jsking981_db_user:15iZRyYXNAGKZdse@cluster0.qwdhx4t.mongodb.net/ToonLordDB?appName=Cluster0";

/**
 * Focuses strictly on marking 100 specific mangas as Premium
 */
const seedPremiumStatus = async () => {
  try {
    console.log("💎 INITIALIZING PREMIUM PROTOCOL...");

    // 1. Reset all current premium statuses to start fresh (Optional)
    await Manga.updateMany({}, { $set: { isPremium: false, price: 0 } });
    console.log("🧹 Vault cleared. Applying new premium assignments...");

    // 2. Fetch target IDs (50 Adult / 50 Non-Adult)
    const adultMangas = await Manga.find({ isAdult: true }).limit(50);
    const generalMangas = await Manga.find({ isAdult: false }).limit(50);

    if (adultMangas.length === 0 && generalMangas.length === 0) {
      console.log("⚠️ No mangas found in the database to update.");
      return;
    }

    console.log(`🎯 Target acquired: ${adultMangas.length} Adult & ${generalMangas.length} General titles.`);

    // 3. Prepare Batch Updates
    // Adult Premium: 50 ToonCoins
    const adultBatch = adultMangas.map(m => 
      Manga.findByIdAndUpdate(m._id, { 
        $set: { isPremium: true, price: 200 } 
      })
    );

    // General Premium: 30 ToonCoins
    
    const generalBatch = generalMangas.map(m => 
      Manga.findByIdAndUpdate(m._id, { 
        $set: { isPremium: true, price: 100 } 
      })
    );

    // 4. Execute all updates in parallel
    await Promise.all([...adultBatch, ...generalBatch]);

    console.log("✅ VAULT UPDATED: 100 Mangas are now marked as PREMIUM.");
    
  } catch (error) {
    console.error("❌ PREMIUM SEED ERROR:", error);
  }
};

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Database Connected to ToonLordDB");
    
    // Run only the premium status assignment
    await seedPremiumStatus();
    
    app.listen(PORT, () => console.log(`🚀 Admin Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error("❌ DB Connection Error:", err));