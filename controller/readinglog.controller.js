// controllers/analyticsController.js
import mongoose from 'mongoose';
import ReadingLog from '../model/ReadingLog.js';

/**
 * LOG NEW READING ACTIVITY
 * Triggered when a user finishes a chapter or spends time reading
 */
export const logReadingActivity = async (req, res) => {
  try {
    const { mangaId, chapterNumber, genre, durationMinutes } = req.body;
    const userId = req.user.id; // Assuming auth middleware provides this

    if (!mangaId || !genre) {
      return res.status(400).json({ message: "Missing required tracking data." });
    }

    const newLog = new ReadingLog({
      userId,
      mangaId,
      chapterNumber,
      genre,
      durationMinutes: durationMinutes || 15,
      createdAt: new Date()
    });

    await newLog.save();
    res.status(201).json({ success: true, message: "Reading activity synchronized." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET FULL ANALYTICS DATA
 * Returns aggregated data for all charts in the Analytics page
 */
export const getReadingAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 1. TOP CARDS: Lifetime Totals
    const totals = await ReadingLog.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: "$durationMinutes" },
          totalChapters: { $sum: 1 },
          uniqueSeries: { $addToSet: "$mangaId" }
        }
      }
    ]);

    // 2. WEEKLY BAR CHART: Last 7 Days
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const weeklyStats = await ReadingLog.aggregate([
      { $match: { userId, createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" }, // 1 (Sun) to 7 (Sat)
          minutes: { $sum: "$durationMinutes" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 3. GENRE PIE CHART: Distribution
    const genreStats = await ReadingLog.aggregate([
      { $match: { userId } },
      { $group: { _id: "$genre", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $limit: 5 } // Top 5 genres
    ]);

    // 4. 6-MONTH PROGRESS AREA CHART (The Wave)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const progressStats = await ReadingLog.aggregate([
      { $match: { userId, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { 
            month: { $month: "$createdAt" }, 
            year: { $year: "$createdAt" } 
          },
          hours: { $sum: { $divide: ["$durationMinutes", 60] } },
          chapters: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Format for Frontend
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    res.status(200).json({
      summary: totals[0] || { totalMinutes: 0, totalChapters: 0, uniqueSeries: [] },
      weeklyData: weeklyStats.map(d => ({
        day: ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d._id],
        minutes: d.minutes
      })),
      genreData: genreStats.map(g => ({
        name: g._id,
        value: g.value
      })),
      progressData: progressStats.map(p => ({
        name: months[p._id.month - 1],
        hours: Math.round(p.hours),
        chapters: p.chapters
      }))
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};