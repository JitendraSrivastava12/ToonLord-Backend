import Manga from '../model/Manga.js';

// 1. GET Friendly Manga (General/SFW)
export const getGeneralManga = async (req, res) => {
  try {
    const { limit = 100, skip = 20 } = req.query;
    
    // Explicitly filter where isAdult is false
    const mangas = await Manga.find({ isAdult: false })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    res.json(mangas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. GET Adult Manga (Pornwah/NSFW)
export const getAdultManga = async (req, res) => {
  try {
    const { limit = 100, skip = 20 } = req.query;
    
    // Explicitly filter where isAdult is true
    const mangas = await Manga.find({ isAdult: true })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });
    res.json(mangas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. GET Manga By ID (Universal)
export const getMangaById = async (req, res) => {
  try {
    const mangaItem = await Manga.findById(req.params.id);
    if (!mangaItem) {
      return res.status(404).json({ message: "Manga not found" });
    }
    res.json(mangaItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
