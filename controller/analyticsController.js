import ReadingSession from '../model/ReadingSession.js';
import mongoose from 'mongoose';

export const syncHeartbeat = async (req, res) => {
  try {
    const { mangaId, chapterNumber, pageNumber, genre, isCompleted } = req.body;
    const userId = req.user.id;

    // session timeout: if last heartbeat was > 30 mins ago, start a new session
    const SESSION_TIMEOUT = 30 * 60 * 1000; 
    const now = new Date();

    const session = await ReadingSession.findOneAndUpdate(
      {
        userId,
        mangaId,
        chapterNumber,
        lastHeartbeat: { $gte: new Date(now - SESSION_TIMEOUT) }
      },
      {
        $set: { lastHeartbeat: now, isCompleted: isCompleted || false },
        $inc: { durationMinutes: 0.5 }, // Assuming heartbeat runs every 30s
        $addToSet: { pagesRead: pageNumber }, // Adds page only if not already in array
        $setOnInsert: { startTime: now, genre: genre } // Only sets on new session creation
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, sessionId: session._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};export const getReadingAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. TOP CARDS
    const totals = await ReadingSession.aggregate([
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

    // 2. WEEKLY BAR CHART
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const weeklyStats = await ReadingSession.aggregate([
      { $match: { userId, createdAt: { $gte: last7Days } } },
      { $group: { _id: { $dayOfWeek: "$createdAt" }, minutes: { $sum: "$durationMinutes" } } },
      { $sort: { "_id": 1 } }
    ]);

    // 3. GENRE PIE CHART
    const genreStats = await ReadingSession.aggregate([
      { $match: { userId } },
      { $group: { _id: "$genre", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $limit: 5 }
    ]);

    // 4. MONTHLY PROGRESS
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const progressStats = await ReadingSession.aggregate([
      { $match: { userId, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          hours: { $sum: { $divide: ["$durationMinutes", 60] } },
          chapters: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 5. STREAK CALCULATION
    const readingDates = await ReadingSession.aggregate([
      { $match: { userId } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } } },
      { $sort: { "_id": -1 } } 
    ]);

    let streak = 0;
    if (readingDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (readingDates[0]._id === today || readingDates[0]._id === yesterday) {
        streak = 1;
        for (let i = 0; i < readingDates.length - 1; i++) {
          const current = new Date(readingDates[i]._id);
          const next = new Date(readingDates[i + 1]._id);
          const diffDays = Math.round((current - next) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) streak++; else break;
        }
      }
    }

    res.status(200).json({
      summary: totals[0] || { totalMinutes: 0, totalChapters: 0, uniqueSeries: [] },
      streak,
      weeklyData: weeklyStats.map(d => ({
        day: ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d._id],
        minutes: Math.round(d.minutes)
      })),
      genreData: genreStats.map(g => ({ name: g._id || "Other", value: g.value })),
      progressData: progressStats.map(p => ({
        name: monthNames[p._id.month - 1], // CONVERTS NUMBER TO NAME
        hours: parseFloat(p.hours.toFixed(1)),
        chapters: p.chapters
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};