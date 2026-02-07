import Manga from '../model/Manga.js';
import User from '../model/User.js';
import Chapter from '../model/Chapter.js';
import { v2 as cloudinary } from 'cloudinary';
import { logActivity } from '../services/activity.service.js';

// 1. CREATE SERIES
export const createSeries = async (req, res) => {
  try {
    const { title, description, author, artist, tags, isAdult } = req.body;

    let coverUrl = "";
    if (req.file) {
      if (req.file.buffer) {
        const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadRes = await cloudinary.uploader.upload(fileBase64, { folder: 'manga_covers' });
        coverUrl = uploadRes.secure_url;
      } else {
        coverUrl = req.file.path || req.file.secure_url || req.file.url;
      }
    }

    let parsedTags = [];
    try {
      if (!tags) parsedTags = [];
      else if (Array.isArray(tags)) parsedTags = tags;
      else parsedTags = JSON.parse(tags);
    } catch (e) { parsedTags = []; }

    const newManga = await Manga.create({
      title,
      description,
      author, 
      artist,
      isAdult: isAdult === 'true' || isAdult === true,
      tags: parsedTags,
      coverImage: coverUrl,
      externalId: `manga_${Date.now()}`
    });

    await User.findByIdAndUpdate(req.user.id, { $push: { createdSeries: newManga._id } });

    await logActivity(req.user.id, {
        category: 'creator',
        type: 'manga_created',
        description: `Successfully published new series: ${newManga.title}`,
        mangaTitle: newManga.title,
        link: `/manga/${newManga._id}`,
        timestamp: new Date()
    });

    res.status(201).json({ success: true, manga: newManga });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. UPDATE MANGA
export const updateManga = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, isAdult, tags } = req.body;

    const manga = await Manga.findById(id);
    if (!manga) return res.status(404).json({ success: false, message: "Manga not found" });

    const user = await User.findById(req.user.id);
    if (!user.createdSeries.includes(id)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updateFields = { title, description, status };
    if (isAdult !== undefined) updateFields.isAdult = isAdult === 'true' || isAdult === true;
    
    if (tags) {
        try { updateFields.tags = Array.isArray(tags) ? tags : JSON.parse(tags); } catch (e) {}
    }

    if (req.file) {
      if (manga.coverImage?.includes("cloudinary")) {
        const publicId = manga.coverImage.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      updateFields.coverImage = req.file.path;
    }

    const updatedManga = await Manga.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    await logActivity(req.user.id, {
        category: 'creator',
        type: 'series_updated',
        description: `Updated series details for: ${updatedManga.title}`,
        mangaTitle: updatedManga.title,
        timestamp: new Date()
    });

    res.status(200).json({ success: true, manga: updatedManga });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. LIVE SEARCH SUGGESTIONS (NEW FEATURE)
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query; 

    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }

    const suggestions = await Manga.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } }
      ]
    })
    .select('title coverImage rating status') 
    .limit(6); 

    res.status(200).json(suggestions);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4. GET ALL MANGAS (With Adult/General filtering)
export const getMangas = async (req, res) => {
    try {
      const { limit = 100, skip = 0 } = req.query;
      let type = req.query.type;
      if (!type) {
        const p = (req.path || req.originalUrl || '').toLowerCase();
        if (p.includes('/adult')) type = 'adult';
        else if (p.includes('/general')) type = 'general';
      }
      const filter = type === 'adult' ? { isAdult: true } : { isAdult: false };
      const mangas = await Manga.find(filter).limit(parseInt(limit)).skip(parseInt(skip)).sort({ createdAt: -1 });
      return res.json(mangas);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. GET MANGA BY ID (Updated with View Counter)
export const getMangaById = async (req, res) => {
    try {
      const manga = await Manga.findByIdAndUpdate(
        req.params.id, 
        { $inc: { views: 1 } }, 
        { new: true }
      );
      
      manga ? res.json(manga) : res.status(404).json({ message: "Not found" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 6. STATS & DELETE
export const getMangaCounts = async (req, res) => {
    try {
      const adultCount = await Manga.countDocuments({ isAdult: true });
      const generalCount = await Manga.countDocuments({ isAdult: false });
      res.json({ adult: adultCount, general: generalCount });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteManga = async (req, res) => {
  try {
    const { id } = req.params;
    const manga = await Manga.findById(id);
    if (!manga) return res.status(404).json({ message: "Manga not found" });

    if (manga.coverImage?.includes("cloudinary")) {
      const publicId = manga.coverImage.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

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
    await User.findByIdAndUpdate(req.user.id, { $pull: { createdSeries: id } });
    await Manga.findByIdAndDelete(id);

    res.json({ success: true, message: "Purge complete" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};