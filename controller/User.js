import User from "../model/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
const generateToken = (id) => {
  console.log("SECRET KEY CHECK:", process.env.JWT_SECRET); // Should not be undefined
  
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env file");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,mobile,
      email,
      
      password: hashedPassword,
      points: 100 // Default points for your manga site
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, username: user.username, role: user.role, points: user.points }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ $or: [{ email: email }, { username: email }] });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid Credentials" });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        points: user.points,
        uploads: user.uploads,
        unlockedCount: user.unlockedContent?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};export const updateProfile = async (req, res) => {
  try {
    const { username, bio, location, mobile } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const updateFields = { username, bio, location, mobile };

    if (req.file) {
      const newPath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      
      // CLEANUP OLD IMAGE
      if (user.profilePicture) {
        const oldFileName = user.profilePicture.split('/').pop();
        const oldFilePath = path.join(process.cwd(), 'uploads', oldFileName);

        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath); 
        }
      }
      updateFields.profilePicture = newPath;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    if (req.file) {
      const orphanPath = path.join(process.cwd(), 'uploads', req.file.filename);
      if (fs.existsSync(orphanPath)) fs.unlinkSync(orphanPath);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};