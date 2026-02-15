import Rating from "../model/Rating.js";
import Manga from "../model/Manga.js";
import mongoose from "mongoose";

// Get a specific user's rating for a manga
export const getUserMangaRating = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const rating = await Rating.findOne({ user: req.user.id, manga: mangaId });
    res.status(200).json(rating);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Post or Update a rating
export const rateManga = async (req, res) => {
  try {
    const { mangaId, score } = req.body;
    const userId = req.user.id;

    // 1. Update existing or create new (Last one wins)
    await Rating.findOneAndUpdate(
      { user: userId, manga: mangaId },
      { score },
      { upsert: true, new: true }
    );

    // 2. Calculate global average for this manga
    const stats = await Rating.aggregate([
      { $match: { manga: new mongoose.Types.ObjectId(mangaId) } },
      { $group: { _id: "$manga", avgRating: { $avg: "$score" } } }
    ]);

    const newAvg = stats[0]?.avgRating?.toFixed(1) || 0;

    // 3. Update the Manga document with the new average
    await Manga.findByIdAndUpdate(mangaId, { rating: newAvg });

    res.status(200).json({ success: true, rating: newAvg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};