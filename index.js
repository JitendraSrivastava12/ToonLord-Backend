import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import dotenv from "dotenv";

// 1. Load env vars first
dotenv.config();

// 2. Import Routes
import mangaRoutes from './router/MangaRouter.js';
import chapterRoutes from './router/ChapterRouter.js';
import heroRoutes from './router/HeroRouter.js';
import userRoutes from './router/UserRouter.js';
import libraryRoutes from './router/libraryRouter.js'
import commentRoutes from './router/CommentRouter.js'
import analyticsRoutes from './router/AnalyticsRouter.js'
import admin from './router/adminRouter.js'

const app = express();
const PORT = process.env.PORT || 5000;

// 3. Middleware
app.use(cors());
app.use(express.json());

// 4. Static Files (Keep this for OLD local images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 5. Routes
app.use("/api", heroRoutes);
app.use("/api/mangas", mangaRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/users", userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/analytics', analyticsRoutes);
// Test this at http://localhost:5000/api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Missing Keys',
    mongo: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

app.use("/admin", admin);


// 6. Connect to DB and Start Server ONCE
mongoose.connect(process.env.MONGO_URI )
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error("❌ DB Connection Error:", err));

// REMOVED THE SECOND app.listen() FROM HERE