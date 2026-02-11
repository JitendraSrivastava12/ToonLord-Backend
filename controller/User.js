import User from "../model/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";
import Manga from "../model/Manga.js";
import { logActivity } from "../services/activity.service.js";
import { sendEmail } from '../utils/sendEmail.js';
import crypto from 'crypto';

/* ---------------- HELPER: GENERATE TOKEN ---------------- */
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Map to store OTPs for registration (Email -> {otp, expiry, data})
const signupOtpStore = new Map();

/* ---------------- 1. SIGNUP & REGISTRATION OTP ---------------- */

// NEW: Request OTP for New User Registration
export const requestSignupOTP = async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ success: false, message: "Email and Username required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store in memory
    signupOtpStore.set(normalizedEmail, { otp, expiry });

    // Send Email
    const mailResponse = await sendEmail(normalizedEmail, otp);

    if (mailResponse.success) {
      res.status(200).json({ success: true, message: "Registration OTP sent to email" });
    } else {
      throw new Error("Failed to send email");
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATED: SIGNUP (Now requires OTP)
export const signup = async (req, res) => {
  try {
    const { username, mobile, email, password, otp } = req.body;

    if (!email || !username || !password || !otp) {
      return res.status(400).json({ success: false, message: "Missing fields (including OTP)" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verify OTP
    const record = signupOtpStore.get(normalizedEmail);
    if (!record) {
      return res.status(400).json({ success: false, message: "No OTP request found for this email" });
    }

    if (Date.now() > record.expiry) {
      signupOtpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    // 2. Check DB one last time
    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // 3. Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      mobile,
      email: normalizedEmail,
      password: hashedPassword,
      points: 100,
    });

    // Cleanup OTP store
    signupOtpStore.delete(normalizedEmail);

    // --- ACTIVITY: Welcome Log ---
    await logActivity(user._id, {
      category: 'system',
      type: 'welcome',
      description: "Welcome to the platform! You've earned 100 Toon Points.",
      timestamp: new Date()
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, username: user.username, role: user.role, points: user.points },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- 2. LOGIN & GET ME ---------------- */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ $or: [{ email }, { username: email }] });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, username: user.username, role: user.role, points: user.points },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import Wallet from "../model/Wallet.js";
import Transaction from "../model/Transaction.js";
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Operative not found" });

    // 1. Try to find the wallet
    let wallet = await Wallet.findOne({ userId: req.user.id });

    // 2. Fallback Logic with Duplicate Protection
    if (!wallet) {
      try {
        wallet = await Wallet.create({ 
          userId: req.user.id,
          toonCoins: 10 
        });
        
        // Update user reference
        user.walletId = wallet._id;
        await user.save();
      } catch (createError) {
        // If a duplicate key error happened here (code 11000), 
        // it means another request created it first. Just fetch it.
        if (createError.code === 11000) {
          wallet = await Wallet.findOne({ userId: req.user.id });
        } else {
          throw createError; // Something else went wrong
        }
      }
    }

    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);

    const userData = user.toObject();
    userData.wallet = wallet; 
    userData.transactions = transactions;

    res.status(200).json({ success: true, user: userData });

  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ success: false, message: "Sync failed: " + error.message });
  }
};
/* ---------------- 3. UPDATE PROFILE ---------------- */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { username, bio, location, mobile } = req.body;
    const updateFields = {};
    if (username) updateFields.username = username;
    if (bio) updateFields.bio = bio;
    if (location) updateFields.location = location;
    if (mobile) updateFields.mobile = mobile;

    if (req.file) {
      if (user.profilePicture && user.profilePicture.includes("cloudinary")) {
        try {
          const publicId = user.profilePicture.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`profile_pics/${publicId}`);
        } catch (err) {
          console.error("Old image cleanup failed:", err);
        }
      }
      updateFields.profilePicture = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ 
      success: true, 
      message: "Identity updated in the grid.",
      user: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- 4. CREATOR DASHBOARD ---------------- */
export const getMyMangas = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('createdSeries');
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json(user.createdSeries);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMyManga = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const { title, description, artist, status, isAdult, tags } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.createdSeries.includes(mangaId)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Ownership required" });
    }

    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ success: false, message: "Manga not found" });

    const updateFields = { title, description, artist, status };
    if (isAdult !== undefined) updateFields.isAdult = isAdult === 'true' || isAdult === true;
    
    if (tags) {
      try { updateFields.tags = Array.isArray(tags) ? tags : JSON.parse(tags); } catch (e) { updateFields.tags = []; }
    }

    if (req.file) {
      if (manga.coverImage && manga.coverImage.includes("cloudinary")) {
        const parts = manga.coverImage.split("/");
        const publicId = parts.slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
      updateFields.coverImage = req.file.path;
    }

    const updatedManga = await Manga.findByIdAndUpdate(
      mangaId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    await logActivity(req.user.id, {
      type: 'reading',
      description: `You updated the series: ${updatedManga.title}`,
      mangaTitle: updatedManga.title,
      link: `/manga/${mangaId}`,
      timestamp: new Date()
    });

    res.status(200).json({ 
      success: true, 
      message: "Series updated successfully", 
      manga: updatedManga 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- 5. AUTHOR REQUEST ---------------- */
export const requestAuthor = async (req, res) => {
  try {
    const { confirmationText } = req.body;

    if (!confirmationText || confirmationText.trim().toLowerCase() !== 'i accept') {
      return res.status(400).json({ 
        success: false, 
        message: "Digital signature 'I ACCEPT' is required to execute the partnership." 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.role === 'author') {
      return res.status(400).json({ success: false, message: "You are already a registered Author." });
    }

    user.role = 'author';
    await logActivity(user._id, {
      category: 'system',
      type: 'milestone_reached',
      description: "Successfully executed the Creator Partnership Agreement. Your account is now upgraded to Author.",
      timestamp: new Date()
    });

    await user.save();
    const updatedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      success: true,
      message: "Partnership activated. Welcome to the creator grid.",
      user: updatedUser
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- 6. ADMIN DASHBOARD ---------------- */
export const getAllUsers = async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Restricted: Admin clearance required." });
    }

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const manageUserStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;
    const validStatuses = ["active", "suspended", "banned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status type." });
    }

    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized: Admin privileges required." });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own status." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { status: status } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    await logActivity(userId, {
      category: 'system',
      type: 'account_alert',
      description: `Your account status has been updated to: ${status.toUpperCase()}.`,
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      message: `User is now ${status}.`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Restricted: Admin clearance required." });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot delete your own admin account here." });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({
      success: true,
      message: "User and associated data purged from the system."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- 7. PASSWORD RESET FLOW ---------------- */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = Date.now() + 5 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = expiry;
    await user.save();

    const mailResponse = await sendEmail(user.email, otp);

    if (mailResponse.success) {
      res.status(200).json({ success: true, message: "OTP sent to your email" });
    } else {
      throw new Error("Failed to send email");
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.otp) {
      return res.status(400).json({ success: false, message: "No OTP request found" });
    }

    if (Date.now() > user.otpExpiry) {
      user.otp = null;
      user.otpExpiry = null;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    await logActivity(user._id, {
      category: 'system',
      type: 'account_alert',
      description: "Your password has been successfully reset via OTP.",
      timestamp: new Date()
    });

    res.status(200).json({ success: true, message: "Password reset successful!" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};