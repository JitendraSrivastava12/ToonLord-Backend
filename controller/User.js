import User from "../model/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cloudinary from "../config/cloudinary.js";
import Manga from "../model/Manga.js";

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      mobile,
      email,
      password: hashedPassword,
      points: 100,
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

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { username: email }],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
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
      },
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

export const updateProfile = async (req, res) => {
  try {
    const { username, bio, location, mobile } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const updateFields = { username, bio, location, mobile };

    if (req.file) {
      if (user.profilePicture && user.profilePicture.includes("cloudinary")) {
        const parts = user.profilePicture.split("/");
        const publicId = parts.slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }

      updateFields.profilePicture = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyMangas = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('createdSeries');
    console.log("Route Hit! User ID:", req.user.id); // Add this
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
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

    // Check if this mangaId is actually in the user's createdSeries array
    if (!user.createdSeries.includes(mangaId)) {
      return res.status(403).json({ success: false, message: "Unauthorized: You do not own this series" });
    }

    // 2. Prepare update object
    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ success: false, message: "Manga document not found" });

    const updateFields = { title, description, artist, status };
    
    // Handle Boolean conversion from FormData strings
    if (isAdult !== undefined) updateFields.isAdult = isAdult === 'true' || isAdult === true;
    
    // Handle Tags
    if (tags) {
      try { updateFields.tags = Array.isArray(tags) ? tags : JSON.parse(tags); } catch (e) { updateFields.tags = []; }
    }

    // 3. Handle Image replacement on Cloudinary
    if (req.file) {
      if (manga.coverImage && manga.coverImage.includes("cloudinary")) {
        const parts = manga.coverImage.split("/");
        const publicId = parts.slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
      updateFields.coverImage = req.file.path;
    }

    // 4. Perform the Update
    const updatedManga = await Manga.findByIdAndUpdate(
      mangaId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({ 
      success: true, 
      message: "Series updated successfully", 
      manga: updatedManga 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};