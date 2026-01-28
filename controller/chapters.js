import Chapter from '../model/Chapter.js';
import mongoose from 'mongoose';
export const getMangaChapters = async (req, res) => {
  try {
    const chapters = await Chapter.find({ mangaId: req.params.mangaId })
      .sort({ chapterNumber: 1 })
      .select('chapterNumber title createdAt');
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getChapterDetails = async (req, res) => {
  try {
    const { mangaId, chapterNum } = req.params;

    // 1. Find the specific chapter
    // Use Number() to convert the string param to a number for the query
    const chapter = await Chapter.findOne({ 
      mangaId, 
      chapterNumber: Number(chapterNum) 
    }).lean(); // .lean() improves performance for read-only queries

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // 2. Construct all image URLs (not just the first one)
    const imageUrls = chapter.pages.map(
      page => `https://uploads.mangadex.org/data/${chapter.hash}/${page}`
    );

    // 3. Get total chapter count for the frontend dropdown
    const totalChapters = await Chapter.countDocuments({ mangaId });

    // 4. Return the full data structure expected by your Frontend
    res.json({
      title: chapter.title || `Chapter ${chapterNum}`,
      pages: imageUrls, // Now returns the full array for .map()
      totalChapters: totalChapters,
      chapterNumber: chapter.chapterNumber
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
//get chapter details
export const getChapterContent = async (req, res) => {
  try {
    const { mangaId } = req.params;

    // 1. Check if the ID is valid to prevent "Cast to ObjectId" or "Cast to Number" errors
    if (!mongoose.Types.ObjectId.isValid(mangaId)) {
      return res.status(400).json({ error: "Invalid Manga ID format" });
    }

    const chapters = await Chapter.find({
      mangaId: new mongoose.Types.ObjectId(mangaId) // Explicitly cast to ObjectId
    })
      .select("_id chapterNumber title createdAt locked")
      .lean() 
      .sort({ chapterNumber: 1 })
      .collation({ locale: "en_US", numericOrdering: true }); 

    console.log(`ToonLord: Found ${chapters.length} chapters for ID ${mangaId}`);
    res.json(chapters);
  } catch (err) {
    // If it still fails, it might be because chapterNumber in the DB is corrupted
    res.status(500).json({ error: err.message });
  }
};