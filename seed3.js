import mongoose from 'mongoose';
import User from './model/User.js'; // Adjust path if needed
import Manga from './model/Manga.js'; // Adjust path if needed
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = "mongodb+srv://jsking981_db_user:15iZRyYXNAGKZdse@cluster0.qwdhx4t.mongodb.net/ToonLordDB?appName=Cluster0";

const seedUploaderID = async () => {
  try {
    console.log("🔍 Initializing Uploader Synchronization...");
    console.log("-----------------------------------------");

    // 1. Fetch only users who have items in createdSeries
    const creators = await User.find({ 
      createdSeries: { $exists: true, $not: { $size: 0 } } 
    });

    if (creators.length === 0) {
      console.log("ℹ️ No users with 'createdSeries' found. Nothing to sync.");
      return;
    }

    console.log(`👤 Found ${creators.length} creators. Starting update...`);

    let totalUpdated = 0;

    // 2. Map through each creator and update their specific mangas
    for (const user of creators) {
      const result = await Manga.updateMany(
        { _id: { $in: user.createdSeries } }, // Find all mangas in this user's list
        { $set: { uploader: user._id } }      // Apply this user's ID as the uploader
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ ${user.username}: Linked ${result.modifiedCount} series.`);
        totalUpdated += result.modifiedCount;
      }
    }

    console.log("-----------------------------------------");
    console.log("✨ UPLOADER SYNC COMPLETE ✨");
    console.log(`📊 Total Mangas Updated: ${totalUpdated}`);
    console.log("-----------------------------------------");

  } catch (error) {
    console.error("❌ Seeding Error:", error);
  }
};

// Database Connection & Execution
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Database Connected for Migration");
    
    await seedUploaderID();
    
    console.log("👋 Migration finished. Closing connection...");
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ DB Connection Error:", err);
    process.exit(1);
  });