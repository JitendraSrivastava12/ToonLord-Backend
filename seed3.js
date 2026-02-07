import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Ensure you have bcryptjs installed: npm install bcryptjs
import User from './model/User.js'; // Ensure this points to your User model

const app = express();
const PORT = 5000;

const MONGO_URI = "mongodb+srv://jsking981_db_user:15iZRyYXNAGKZdse@cluster0.qwdhx4t.mongodb.net/ToonLordDB?appName=Cluster0";

const seedAdminAccount = async () => {
  try {
    console.log("🔍 Checking for existing Admin account...");

    const adminEmail = "jsking981@gmail.com"; // Change to your preferred admin email
    const adminPassword = "Jsking@981"; // Change to your preferred admin password

    // 1. Check if Admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`ℹ️ Admin already exists: ${existingAdmin.username} (${existingAdmin.email})`);
      console.log("⚠️ Skipping seed process.");
      return;
    }

    // 2. Hash the password for security
    console.log("🔐 Hashing password...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // 3. Create the Admin User
    const newAdmin = new User({
      username: "ToonLord_Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",      // Critical: Set to 'admin'
      status: "active",   // Ensure they are active
      profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
      bio: "Master administrator of ToonLord.",
      points: 999999      // Unlimited points for the king
    });

    await newAdmin.save();
    
    console.log("-----------------------------------------");
    console.log("✨ ADMIN ACCOUNT CREATED SUCCESSFULLY ✨");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log("-----------------------------------------");
    console.log("🚨 PLEASE DELETE THIS SCRIPT OR SECURE IT AFTER USE.");

  } catch (error) {
    console.error("❌ Seeding Error:", error);
  }
};

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ Database Connected");
    
    // Execute the seed
    await seedAdminAccount();
    
    app.listen(PORT, () => {
      console.log(`🚀 Seed Server running on http://localhost:${PORT}`);
      console.log("👋 You can close this process (Ctrl+C) once seeding is finished.");
    });
  })
  .catch(err => console.error("❌ DB Connection Error:", err));