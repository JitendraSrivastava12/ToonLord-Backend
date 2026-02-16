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
import libraryRoutes from './router/libraryRouter.js';
import commentRoutes from './router/CommentRouter.js';
import analyticsRoutes from './router/AnalyticsRouter.js';
import admin from './router/adminRouter.js';
import reportRoutes from './router/ReportRouter.js';
import paymentRoutes from './router/payment.js';
import trans from './router/transaction.js';
import rat from './router/RatingRouter.js'

const app = express();
const PORT = process.env.PORT || 5000;

// 3. Middleware - UPDATED FOR DEPLOYMENT
const corsOptions = {
  // Allow your Vercel URL and Localhost for development
  origin: [process.env.CLIENT_URL, 'http://localhost:5173'], 
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// 4. Static Files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 5. Routes Registration
app.use("/api", heroRoutes);
app.use("/api/mangas", mangaRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/users", userRoutes); 
app.use('/api/comments', commentRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use("/reports", reportRoutes);
app.use("/admin", admin);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', trans);
app.use('/api/ratings', rat);

// 6. Health Check (Crucial for Render/Vercel connectivity)
app.get("/health", (req, res) => {
  res.status(200).send("ToonLord Engine: Operational");
});

/* --- 7. GLOBAL ERROR HANDLER --- */
app.use((err, req, res, next) => {
  console.error("🚨 SYSTEM_ERROR:", err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Internal Server Protocol Failure", 
    error: err.message 
  });
});

// 8. Connect to DB and Start Server
const connectDB = async () => {
  try {
    // Ensure MONGO_URI is in your Render Environment Variables
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Linked to Neural Archive (MongoDB)");

    app.listen(PORT, () => {
      console.log(`🚀 ToonLord Engine Online on Port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();