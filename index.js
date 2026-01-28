import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import mangaRoutes from './router/MangaRouter.js';
import chapterRoutes from './router/ChapterRouter.js';
import heroRoutes from './router/HeroRouter.js';
import userRoutes from './router/UserRouter.js';
import dotenv from "dotenv";
// MUST BE BEFORE YOUR ROUTE IMPORTS
dotenv.config();
const app = express();
const MONGO_URI = process.env.URI ;
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use("/api", heroRoutes);
app.use("/api/mangas", mangaRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/users",userRoutes)

// Connect to DB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error("❌ DB Connection Error:", err));