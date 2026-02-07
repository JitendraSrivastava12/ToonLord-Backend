import User from "../model/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";
import Manga from "../model/Manga.js";
import { logActivity } from "../services/activity.service.js";
/* ---------------- HELPER: LOG ACTIVITY ---------------- */


const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// 1. SIGNUP
export const signup = async (req, res) => {
  try {
    const { username, mobile, email, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      mobile,
      email,
      password: hashedPassword,
      points: 100,
    });

    // --- ACTIVITY: Welcome Log ---
    await logActivity(user._id, {
      category:'system',
      type: 'welcome',
      description: "Welcome to the platform! You've earned 100 starting points.",
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

// 2. LOGIN & GET ME
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

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 1. Prepare Update Object
    const { username, bio, location, mobile } = req.body;
    const updateFields = {};
    if (username) updateFields.username = username;
    if (bio) updateFields.bio = bio;
    if (location) updateFields.location = location;
    if (mobile) updateFields.mobile = mobile;

    // 2. Handle File Upload
    if (req.file) {
      // Delete old profile picture from Cloudinary if it exists
      if (user.profilePicture && user.profilePicture.includes("cloudinary")) {
        try {
          // Extracts the public_id from the URL
          const publicId = user.profilePicture.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`profile_pics/${publicId}`);
        } catch (err) {
          console.error("Old image cleanup failed:", err);
        }
      }
      // req.file.path contains the new Cloudinary URL
      updateFields.profilePicture = req.file.path;
    }

    // 3. Update Database
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

// 4. GET MY MANGAS (Creator Dashboard)
export const getMyMangas = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('createdSeries');
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json(user.createdSeries);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. UPDATE MY MANGA (With Activity Logging)
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

    // --- ACTIVITY: Creator Dashboard Update ---
    await logActivity(req.user.id, {
      type: 'reading', // Map to your enum (using reading for general series activity)
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
// 6. REQUEST AUTHOR (Become a Creator)
export const requestAuthor = async (req, res) => {
  try {
    const { confirmationText } = req.body;

    // 1. Validate the signature from the contract modal
    if (!confirmationText || confirmationText.trim().toLowerCase() !== 'i accept') {
      return res.status(400).json({ 
        success: false, 
        message: "Digital signature 'I ACCEPT' is required to execute the partnership." 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 2. Safety Check: If already an author, don't repeat the process
    if (user.role === 'author') {
      return res.status(400).json({ success: false, message: "You are already a registered Author." });
    }

    // 3. Upgrade Role
    user.role = 'author';

    // 4. Log the Milestone to Activity Feed
    // Note: Ensure your logActivity service matches these fields
    await logActivity(user._id, {
      category: 'system',
      type: 'milestone_reached',
      description: "Successfully executed the Creator Partnership Agreement. Your account is now upgraded to Author.",
      timestamp: new Date()
    });

    await user.save();

    // 5. Return updated user (excluding password)
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
// 7. GET ALL USERS (Admin Dashboard)
export const getAllUsers = async (req, res) => {
  try {
    // 1. Authorization Check: Only admins should access this
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Restricted: Admin clearance required." });
    }

    // 2. Fetch all users, excluding passwords
    // We sort by 'createdAt' so newest users appear first
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

// 8. MANAGE USER STATUS (Ban/Suspend/Active)
export const manageUserStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;

    // 1. Validation
    const validStatuses = ["active", "suspended", "banned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status type." });
    }

    // 2. Authorization Check
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized: Admin privileges required." });
    }

    // 3. Prevent self-banning
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own status." });
    }

    // 4. Update the User
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { status: status } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    // 5. Log System Activity for the target user
    await logActivity(userId, {
      category: 'system',
      type: 'points_earned', // Reusing system type for notifications
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
// 9. DELETE USER DATA (Permanent Removal)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Authorization Check (Admin only)
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Restricted: Admin clearance required." });
    }

    // 2. Prevent self-deletion via this route
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot delete your own admin account here." });
    }

    // 3. Delete the user
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