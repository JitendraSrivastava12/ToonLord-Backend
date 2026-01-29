import Chapter from '../model/Chapter.js';
import Manga from '../model/Manga.js';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

// 1. GET ALL CHAPTERS FOR A MANGA (For the list view)
export const getChapterContent = async (req, res) => {
  try {
    const { mangaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mangaId)) {
      return res.status(400).json({ error: "Invalid Manga ID format" });
    }

    const chapters = await Chapter.find({ mangaId: new mongoose.Types.ObjectId(mangaId) })
      .select("_id chapterNumber title createdAt pages")
      .sort({ chapterNumber: 1 })
      .lean();

    res.json(chapters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. GET SPECIFIC CHAPTER DETAILS (For the reader view)
export const getChapterDetails = async (req, res) => {
  try {
    const { mangaId, chapterNum } = req.params;

    const chapter = await Chapter.findOne({ 
      mangaId: new mongoose.Types.ObjectId(mangaId), 
      chapterNumber: Number(chapterNum) 
    }).lean();

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    /**
     * FIX: If the chapter has a 'hash', it's old MangaDex data.
     * If not, it's new Cloudinary data (pages are already full URLs).
     */
    const imageUrls = chapter.hash 
      ? chapter.pages.map(page => `https://uploads.mangadex.org/data/${chapter.hash}/${page}`)
      : chapter.pages; // Cloudinary URLs are already absolute

    const totalChapters = await Chapter.countDocuments({ mangaId });

    res.json({
      _id: chapter._id,
      title: chapter.title || `Chapter ${chapterNum}`,
      pages: imageUrls, 
      totalChapters: totalChapters,
      chapterNumber: chapter.chapterNumber
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. UPLOAD NEW CHAPTER (Cloudinary Logic with batching)
export const uploadChapter = async (req, res) => {
  try {
    const { mangaId, chapterNumber, title } = req.body;
    const files = req.files; 

    console.log('📤 Upload request:', { mangaId, chapterNumber, title, fileCount: files?.length });

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No pages uploaded" });
    }

    // Validate mangaId format
    if (!mongoose.Types.ObjectId.isValid(mangaId)) {
      return res.status(400).json({ message: "Invalid Manga ID format" });
    }

    // Validate all files have buffers
    for (let i = 0; i < files.length; i++) {
      if (!files[i].buffer) {
        console.error(`❌ File ${i + 1} missing buffer:`, files[i]);
        return res.status(400).json({ 
          message: `File ${i + 1} missing data. Ensure multipart/form-data is used.` 
        });
      }
    }

    console.log('✅ All files validated');

    // Upload one at a time for better stability and higher bandwidth per image
    const BATCH_SIZE = 1;
    const imageUrls = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      console.log(`📦 Uploading batch ${Math.ceil((i + 1) / BATCH_SIZE)} (${batch.length} files)`);
      
      const uploadPromises = batch.map((file, idx) => {
        console.log(`  └─ File ${i + idx + 1}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return cloudinary.uploader.upload(fileBase64, { 
          folder: `mangas/${mangaId}/ch_${chapterNumber}`,
          resource_type: 'auto',
          timeout: 180000 // 180 second timeout for high quality uploads
        }).catch(err => {
          console.error(`  ❌ Cloudinary error for file ${i + idx + 1}:`, err?.error?.message || err);
          throw err;
        });
      });

      try {
        const results = await Promise.all(uploadPromises);
        imageUrls.push(...results.map(result => result.secure_url));
        console.log(`✅ Batch ${Math.ceil((i + 1) / BATCH_SIZE)} uploaded: ${results.length} files`);
      } catch (batchErr) {
        console.error(`❌ Batch ${Math.ceil((i + 1) / BATCH_SIZE)} failed:`, batchErr?.error?.message || batchErr);
        throw new Error(`Batch upload failed: ${batchErr?.error?.message || batchErr?.message || 'Unknown error'}`);
      }
    }

    console.log('💾 Creating chapter record...');
    const newChapter = await Chapter.create({
      mangaId: new mongoose.Types.ObjectId(mangaId),
      chapterNumber: Number(chapterNumber),
      title,
      pages: imageUrls,
      externalId: `ch_${mangaId}_${chapterNumber}_${Date.now()}`
    });

    console.log('📊 Updating manga chapter count...');
    const updateResult = await Manga.findByIdAndUpdate(
      mangaId, 
      { $inc: { TotalChapter: 1 } },
      { new: true }
    );
    console.log('✅ Manga updated:', { mangaId, newTotalChapter: updateResult?.TotalChapter });

    console.log('✅ Chapter uploaded successfully!');
    res.status(201).json({ success: true, chapter: newChapter });
  } catch (error) {
    const errorMsg = error?.message || String(error) || 'Unknown error';
    const errorStack = error?.stack || 'No stack trace';
    console.error('❌ Upload error:', errorMsg);
    console.error('Stack:', errorStack);
    res.status(500).json({ success: false, message: errorMsg, details: errorStack });
  }
};

// 4. DELETE CHAPTER
export const deleteChapter = async (req, res) => {
  try {
    const { mangaId, chapterId } = req.params;

    console.log(`🗑️  Deleting chapter ${chapterId} from manga ${mangaId}`);

    // Find and delete the chapter
    const chapter = await Chapter.findByIdAndDelete(chapterId);
    
    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    // Delete chapter images from Cloudinary if they exist
    if (chapter.pages && chapter.pages.length > 0) {
      console.log(`🖼️  Deleting ${chapter.pages.length} images from Cloudinary...`);
      const deletePromises = chapter.pages.map(url => {
        const publicId = url.split('/').slice(-3).join('/').split('.')[0];
        return cloudinary.uploader.destroy(publicId).catch(err => {
          console.warn(`⚠️  Failed to delete image ${publicId}:`, err.message);
        });
      });
      await Promise.all(deletePromises);
    }

    // Decrement chapter count in Manga
    console.log(`📊 Decrementing chapter count for manga ${mangaId}`);
    const updateResult = await Manga.findByIdAndUpdate(
      mangaId,
      { $inc: { TotalChapter: -1 } },
      { new: true }
    );
    console.log(`✅ Chapter deleted. New count: ${updateResult?.TotalChapter}`);

    res.status(200).json({ success: true, message: "Chapter deleted successfully" });
  } catch (error) {
    console.error('❌ Delete error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. EDIT CHAPTER
export const editChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { chapterNumber, title } = req.body;

    console.log(`✏️  Editing chapter ${chapterId}:`, { chapterNumber, title });

    const updatedChapter = await Chapter.findByIdAndUpdate(
      chapterId,
      { $set: { chapterNumber, title } },
      { new: true }
    );

    if (!updatedChapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    console.log(`✅ Chapter updated successfully`);
    res.status(200).json({ success: true, chapter: updatedChapter });
  } catch (error) {
    console.error('❌ Edit error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};