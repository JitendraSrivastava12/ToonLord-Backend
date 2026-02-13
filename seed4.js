import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './model/User.js';
import Wallet from './model/Wallet.js';

dotenv.config();

const seedWalletsAndDeepClean = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB. Starting deep data cleanup...");

    const users = await User.find();
    let walletCreatedCount = 0;
    let logsCleanedCount = 0;

    for (let user of users) {
      let isModified = false;

      // --- STEP A: DEEP CLEAN ACTIVITY LOGS ---
      if (user.activityLog && user.activityLog.length > 0) {
        user.activityLog = user.activityLog.map((log) => {
          let modifiedLog = log;

          // 1. Fix missing 'category' (The current error)
          if (!modifiedLog.category) {
            // Logic: If it's a reading status, it's 'reader', otherwise 'system'
            const readerTypes = ['Reading', 'Bookmarks', 'Favorite', 'Subscribe', 'Completed'];
            modifiedLog.category = readerTypes.includes(modifiedLog.type) ? 'reader' : 'system';
            isModified = true;
          }

          // 2. Fix 'points_earned' -> 'coins_earned'
          if (modifiedLog.type === 'points_earned') {
            modifiedLog.type = 'coins_earned';
            isModified = true;
          }

          return modifiedLog;
        });
        
        logsCleanedCount++;
      }

      // --- STEP B: CREATE MISSING WALLETS ---
      const existingWallet = await Wallet.findOne({ userId: user._id });

      if (!existingWallet) {
        const newWallet = await Wallet.create({
          userId: user._id,
          toonCoins: user.role === 'admin' ? 5000 : 10, 
        });

        user.walletId = newWallet._id;
        isModified = true;
        walletCreatedCount++;
        console.log(`✅ Wallet created for: ${user.username}`);
      }

      // --- STEP C: SAVE CHANGES ---
      if (isModified) {
        try {
          await user.save();
        } catch (validationError) {
          console.error(`⚠️ Could not save user ${user.username}: ${validationError.message}`);
          // If a user is STILL failing validation, we can force the update 
          // but save() is safer for now.
        }
      }
    }

    console.log('\n--- Deep Cleanup Summary ---');
    console.log(`- Wallets Created: ${walletCreatedCount}`);
    console.log(`- User Logs Cleaned: ${logsCleanedCount}`);
    console.log('----------------------------');
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seedWalletsAndDeepClean();