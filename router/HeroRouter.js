import express from 'express';
const router = express.Router();
import Manga from '../model/Manga.js';
router.get("/hero-images/:mode", async (req, res) => {
  try {
    const { mode } = req.params;
    const isAdult = mode === "adult";

    const images = await Manga.aggregate([
      { $match: { isAdult: isAdult } },
      { $sample: { size: 12 } },
      { $project: { _id: 0, coverImage: 1 } }
    ]);

    res.json(images.map(m => m.coverImage));
  } catch (err) {
    console.error("Hero images error:", err);
    res.status(500).json({ message: "Failed to load hero images" });
  }
});
export default router;