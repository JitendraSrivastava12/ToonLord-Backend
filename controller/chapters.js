import Chapter from '../model/Chapter.js';
import Manga from '../model/Manga.js';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

// 1. GET ALL CHAPTERS FOR A MANGA (For the list view)
export const getChapterContent = async (req, res) => {
  try {
    const { mangaId } = req.params;

    // Support both ObjectId and legacy string IDs stored in older chapters
    const orConditions = [];
    if (mongoose.Types.ObjectId.isValid(mangaId)) {
      orConditions.push({ mangaId: new mongoose.Types.ObjectId(mangaId) });
    }
    orConditions.push({ mangaId: mangaId }); // string match fallback

    const chapters = await Chapter.find({ $or: orConditions })
      .select("_id chapterNumber title createdAt pages hash")
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

    // Accept both ObjectId and legacy string IDs
    const orConditions = [];
    if (mongoose.Types.ObjectId.isValid(mangaId)) {
      orConditions.push({ mangaId: new mongoose.Types.ObjectId(mangaId) });
    }
    orConditions.push({ mangaId: mangaId }); // string-match fallback

    const chapter = await Chapter.findOne({
      chapterNumber: Number(chapterNum),
      $or: orConditions
    }).lean();

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    /**
     * Normalize image URLs:
     * - Old MangaDex data has `hash` and page filenames -> construct full URLs
     * - New Cloudinary chapters have full URLs in `pages`
     */
    const imageUrls = chapter.hash && Array.isArray(chapter.pages)
      ? chapter.pages.map(page => `https://uploads.mangadex.org/data/${chapter.hash}/${page}`)
      : chapter.pages || [];

    // Count total chapters for this manga (match both id formats)
    const countConditions = orConditions.map(cond => cond);
    const totalChapters = await Chapter.countDocuments({ $or: countConditions });

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
    const { mangaId, chapterNumber, title, quality = 'high', jpegQuality = 65, maxWidth = 1400, convertPngToJpeg = 'true' } = req.body;
    const files = req.files; 

    console.log('📤 Upload request:', { mangaId, chapterNumber, title, quality, jpegQuality, maxWidth, convertPngToJpeg, fileCount: files?.length });

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
      
      const uploadPromises = batch.map(async (file, idx) => {
        console.log(`  └─ File ${i + idx + 1}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        let bufferToUpload = file.buffer;
        let mimetype = file.mimetype;

        // If user requested low MB, compress the image server-side using sharp
        if (quality === 'low') {
          try {
            const jpegQ = Number(jpegQuality) || 65;
            const maxW = Number(maxWidth) || 1400;
            const convertPng = convertPngToJpeg === 'true' || convertPngToJpeg === true;

            const isPng = file.mimetype === 'image/png';
            if (isPng && !convertPng) {
              const compressed = await sharp(file.buffer)
                .resize({ width: maxW, withoutEnlargement: true })
                .png()
                .toBuffer();
              bufferToUpload = compressed;
              mimetype = file.mimetype;
              console.log(`    ↳ Compressed PNG size: ${(bufferToUpload.length / 1024 / 1024).toFixed(2)} MB`);
            } else {
              const compressed = await sharp(file.buffer)
                .resize({ width: maxW, withoutEnlargement: true })
                .jpeg({ quality: jpegQ })
                .toBuffer();
              bufferToUpload = compressed;
              mimetype = 'image/jpeg';
              console.log(`    ↳ Compressed JPEG size: ${(bufferToUpload.length / 1024 / 1024).toFixed(2)} MB`);
            }
          } catch (err) {
            console.warn('    ⚠️ Compression failed; uploading original buffer', err.message);
          }
        }

        const fileBase64 = `data:${mimetype};base64,${bufferToUpload.toString('base64')}`;
        return cloudinary.uploader.upload(fileBase64, {
          folder: `mangas/${mangaId}/ch_${chapterNumber}`,
          resource_type: 'auto',
          timeout: quality === 'high' ? 180000 : quality === 'low' ? 90000 : 120000
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