import Manga from '../model/Manga.js';
import User from '../model/User.js';
import Chapter from '../model/Chapter.js';
import { v2 as cloudinary } from 'cloudinary';

// 1. CREATE SERIES
export const createSeries = async (req, res) => {
  try {
    const { title, description, author, artist, tags, isAdult } = req.body;

    // Handle uploaded cover file (support multer memory buffer or CloudinaryStorage fields)
    let coverUrl = "";
    if (req.file) {
      if (req.file.buffer) {
        const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadRes = await cloudinary.uploader.upload(fileBase64, { folder: 'manga_covers' });
        coverUrl = uploadRes.secure_url;
      } else if (req.file.path) {
        coverUrl = req.file.path;
      } else if (req.file.secure_url) {
        coverUrl = req.file.secure_url;
      } else if (req.file.url) {
        coverUrl = req.file.url;
      }
    }

    // Be tolerant with tags: accept array or JSON string
    let parsedTags = [];
    try {
      if (!tags) parsedTags = [];
      else if (Array.isArray(tags)) parsedTags = tags;
      else parsedTags = JSON.parse(tags);
    } catch (e) {
      parsedTags = [];
    }

    const newManga = await Manga.create({
      title,
      description,
      author,
      artist,
      // Ensure boolean
      isAdult: isAdult === 'true' || isAdult === true,
      tags: parsedTags,
      coverImage: coverUrl,
      externalId: `manga_${Date.now()}`
    });

    await User.findByIdAndUpdate(req.user.id, { $push: { createdSeries: newManga._id } });

    res.status(201).json({ success: true, manga: newManga });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// 2. GET MANGAS (FILTERED)
export const getMangas = async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;

    // Determine requested type from query param or from the path (router may set path /adult or /general)
    let type = req.query.type;
    if (!type) {
      const p = (req.path || req.originalUrl || '').toLowerCase();
      if (p.includes('/adult')) type = 'adult';
      else if (p.includes('/general')) type = 'general';
    }

    const filter = type === 'adult' ? { isAdult: true } : { isAdult: false };

    const mangas = await Manga.find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    // Debug logging to verify incoming request and applied filter
    console.log('[getMangas] path=', req.path || req.originalUrl, 'query=', req.query, 'resolvedType=', type, 'results=', mangas.length);

    return res.json(mangas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Debug endpoint: return counts for adult vs general
export const getMangaCounts = async (req, res) => {
  try {
    const adultCount = await Manga.countDocuments({ isAdult: true });
    const generalCount = await Manga.countDocuments({ isAdult: false });
    res.json({ adult: adultCount, general: generalCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. GET MANGA BY ID
export const getMangaById = async (req, res) => {
  try {
    const manga = await Manga.findById(req.params.id);
    manga ? res.json(manga) : res.status(404).json({ message: "Not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. DELETE MANGA (FULL PURGE)
export const deleteManga = async (req, res) => {
  try {
    const { id } = req.params;
    const manga = await Manga.findById(id);
    if (!manga) return res.status(404).json({ message: "Manga not found" });

    // A. Delete Cover from Cloudinary
    if (manga.coverImage?.includes("cloudinary")) {
      const publicId = manga.coverImage.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // B. Delete Chapters & Pages from Cloudinary
    const chapters = await Chapter.find({ mangaId: id });
    for (const ch of chapters) {
      if (ch.pages?.length > 0) {
        const deletePromises = ch.pages.map(url => {
          const pid = url.split('/').slice(-3).join('/').split('.')[0];
          return cloudinary.uploader.destroy(pid);
        });
        await Promise.all(deletePromises);
      }
    }
    await Chapter.deleteMany({ mangaId: id });

    // C. Remove User Reference & Manga Record
    await User.findByIdAndUpdate(req.user.id, { $pull: { createdSeries: id } });
    await Manga.findByIdAndDelete(id);

    res.json({ success: true, message: "Purge complete" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const updateManga = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, genre, status, isAdult, tags } = req.body;

    const manga = await Manga.findById(id);
    if (!manga) return res.status(404).json({ success: false, message: "Manga not found" });

    // Ownership Check
    if (manga.author?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updateFields = { title, description, genre, status };
    if (isAdult !== undefined) updateFields.isAdult = isAdult === 'true' || isAdult === true;
    
    if (tags) {
        try { updateFields.tags = Array.isArray(tags) ? tags : JSON.parse(tags); } catch (e) {}
    }

    if (req.file) {
      // Delete old image
      if (manga.coverImage?.includes("cloudinary")) {
        await cloudinary.uploader.destroy(getPublicId(manga.coverImage));
      }
      updateFields.coverImage = req.file.path;
    }

    const updatedManga = await Manga.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, manga: updatedManga });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};