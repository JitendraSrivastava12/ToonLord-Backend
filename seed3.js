import mongoose from 'mongoose';
import User from './model/User.js'; // Adjust path
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = "mongodb+srv://jsking981_db_user:15iZRyYXNAGKZdse@cluster0.qwdhx4t.mongodb.net/ToonLordDB?appName=Cluster0";

const repairActivityLogs = async () => {
  try {
    console.log("🔍 Initializing Activity Log Repair...");
    console.log("-----------------------------------------");

    // We look for users who have at least one activityLog entry missing the 'category' field
    const result = await User.updateMany(
      { "activityLog.category": { $exists: false } }, 
      { 
        $set: { "activityLog.$[elem].category": "system" } 
      },
      { 
        // Filter to only update array elements where category is missing
        arrayFilters: [{ "elem.category": { $exists: false } }],
        multi: true 
      }
    );

    console.log(`✅ Repair Analysis:`);
    console.log(`📊 Documents Scanned: ${result.matchedCount}`);
    console.log(`🛠️ Logs Fixed: ${result.modifiedCount}`);
    console.log("-----------------------------------------");
    console.log("✨ DATABASE REPAIR COMPLETE ✨");

  } catch (error) {
    console.error("❌ Migration Error:", error);
  }
};

// Database Connection & Execution
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Database Connected for Repair");
    
    await repairActivityLogs();
    
    console.log("👋 Migration finished. Closing connection...");
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ DB Connection Error:", err);
    process.exit(1);
  });