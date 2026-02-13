import Chapter from '../model/Chapter.js';
import Manga from '../model/Manga.js';
import User from '../model/User.js'; // Added User import
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

import { logActivity } from '../services/activity.service.js';
// 1. GET ALL CHAPTERS FOR A MANGA
export const getChapterContent = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const orConditions = [];
    if (mongoose.Types.ObjectId.isValid(mangaId)) {
      orConditions.push({ mangaId: new mongoose.Types.ObjectId(mangaId) });
    }
    orConditions.push({ mangaId: mangaId });

    const chapters = await Chapter.find({ $or: orConditions })
      .select("_id chapterNumber title createdAt pages hash")
      .sort({ chapterNumber: 1 })
      .lean();

    res.json(chapters);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// controller/chapters.js
export const getChapterDetails = async (req, res) => {
  try {
    const { mangaId, chapterNum } = req.params;
    const currentUser = req.user; 
    const chNum = Number(chapterNum);

    const queryId = new mongoose.Types.ObjectId(mangaId);

    const [chapter, manga] = await Promise.all([
      Chapter.findOne({ chapterNumber: chNum, mangaId: queryId }).lean(),
      Manga.findById(queryId).select('title isPremium uploader').lean()
    ]);

    if (!chapter || !manga) return res.status(404).json({ message: "Content not found" });

    // --- CRITICAL PERMISSION CHECK ---
    let hasAccess = false;

    // 1. Uploader always has access
    const isUploader = currentUser && manga.uploader?.toString() === currentUser._id.toString();

    // 2. Check if user actually owns this premium manga
    const isOwned = currentUser?.unlockedContent?.some(item => 
      item.manga.toString() === manga._id.toString()
    );

    if (isUploader) {
      hasAccess = true;
    } else if (manga.isPremium) {
      // PREVENT LEAK: If Premium, only chapters 1, 2, and 3 are free. 
      // Chapter 4+ REQUIRES isOwned to be true.
      hasAccess = chNum <= 3 || isOwned; 
    } else {
      // Free Manga logic: Guest (3 chapters) / Logged in (All)
      hasAccess = chNum <= 3 || !!currentUser;
    }

    // 3. SECURE DATA RETURN
    // If hasAccess is false, we return empty pages. Chapter 4 will be blank!
    const imageUrls = hasAccess 
      ? (chapter.hash ? chapter.pages.map(p => `https://uploads.mangadex.org/data/${chapter.hash}/${p}`) : chapter.pages)
      : [];

    res.json({
      ...chapter,
      pages: imageUrls, // This will be [] if they haven't bought it
      isLocked: !hasAccess
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};// 3. UPLOAD NEW CHAPTER (With Activity Logging)
export const uploadChapter = async (req, res) => {
  try {
    const { mangaId, chapterNumber, title, quality = 'high', jpegQuality = 65, maxWidth = 1400, convertPngToJpeg = 'true' } = req.body;
    const files = req.files; 

    if (!files || files.length === 0) return res.status(400).json({ message: "No pages uploaded" });
    if (!mongoose.Types.ObjectId.isValid(mangaId)) return res.status(400).json({ message: "Invalid Manga ID format" });

    const BATCH_SIZE = 1;
    const imageUrls = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const uploadPromises = batch.map(async (file) => {
        let bufferToUpload = file.buffer;
        let mimetype = file.mimetype;

        if (quality === 'low') {
          try {
            const jpegQ = Number(jpegQuality) || 65;
            const maxW = Number(maxWidth) || 1400;
            const convertPng = convertPngToJpeg === 'true' || convertPngToJpeg === true;
            if (file.mimetype === 'image/png' && !convertPng) {
              bufferToUpload = await sharp(file.buffer).resize({ width: maxW, withoutEnlargement: true }).png().toBuffer();
            } else {
              bufferToUpload = await sharp(file.buffer).resize({ width: maxW, withoutEnlargement: true }).jpeg({ quality: jpegQ }).toBuffer();
              mimetype = 'image/jpeg';
            }
          } catch (err) { console.warn('Compression failed', err.message); }
        }

        const fileBase64 = `data:${mimetype};base64,${bufferToUpload.toString('base64')}`;
        return cloudinary.uploader.upload(fileBase64, {
          folder: `mangas/${mangaId}/ch_${chapterNumber}`,
          resource_type: 'auto'
        });
      });

      const results = await Promise.all(uploadPromises);
      imageUrls.push(...results.map(result => result.secure_url));
    }

    const newChapter = await Chapter.create({
      mangaId: new mongoose.Types.ObjectId(mangaId),
      chapterNumber: Number(chapterNumber),
      title,
      pages: imageUrls,
      externalId: `ch_${mangaId}_${chapterNumber}_${Date.now()}`
    });

    const updatedManga = await Manga.findByIdAndUpdate(
      mangaId, 
      { $inc: { TotalChapter: 1 } },
      { new: true }
    );
    if (updatedManga.subscribers && updatedManga.subscribers.length > 0) {
      const notification = {
        category: 'system',
        type: 'Subscribe', // Or 'chapter_uploaded' depending on your UI preference
        description: `New Chapter: Ch. ${chapterNumber} of ${updatedManga.title} is now available!`,
        mangaId: updatedManga._id,
        chapterId: newChapter._id,
        isRead: false,
        timestamp: new Date()
      };
      await User.updateMany(
        { _id: { $in: updatedManga.subscribers } },
        { 
          $push: { 
            activityLog: { 
              $each: [notification], 
              $position: 0, 
              $slice: 100 
            } 
          } 
        }
      );
    }

    // --- ACTIVITY LOGGING ---
    await logActivity(req.user.id, {
        category: 'creator',
        type: 'chapter_uploaded', // Map to your activity schema enum
        description: `Uploaded Chapter ${chapterNumber} of ${updatedManga?.title || 'a series'}`,
        mangaTitle: updatedManga?.title,
        link: `/${mangaId}/${chapterNumber}`,
        timestamp: new Date()
    });

    res.status(201).json({ success: true, chapter: newChapter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. DELETE CHAPTER
export const deleteChapter = async (req, res) => {
  try {
    const { mangaId, chapterId } = req.params;
    const chapter = await Chapter.findByIdAndDelete(chapterId);
    if (!chapter) return res.status(404).json({ success: false, message: "Chapter not found" });

    if (chapter.pages && chapter.pages.length > 0) {
      const deletePromises = chapter.pages.map(url => {
        const publicId = url.split('/').slice(-3).join('/').split('.')[0];
        return cloudinary.uploader.destroy(publicId).catch(() => {});
      });
      await Promise.all(deletePromises);
    }

    await Manga.findByIdAndUpdate(mangaId, { $inc: { TotalChapter: -1 } });
    res.status(200).json({ success: true, message: "Chapter deleted successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 5. EDIT CHAPTER (With Activity Logging)
export const editChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { chapterNumber, title } = req.body;

    const updatedChapter = await Chapter.findByIdAndUpdate(
      chapterId,
      { $set: { chapterNumber, title } },
      { new: true }
    );

    if (!updatedChapter) return res.status(404).json({ success: false, message: "Chapter not found" });

    const manga = await Manga.findById(updatedChapter.mangaId);

    // --- ACTIVITY LOGGING ---
    await logActivity(req.user.id, {
        category: 'creator',
        type: 'edit_chapter',
        description: `Edited Chapter ${chapterNumber} of ${manga?.title || 'a series'}`,
        mangaTitle: manga?.title,
        timestamp: new Date()
    });

    res.status(200).json({ success: true, chapter: updatedChapter });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};