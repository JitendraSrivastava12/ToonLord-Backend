import express from 'express';
import { 
    getChapterContent, 
    getChapterDetails, 
    uploadChapter,
    deleteChapter,
    editChapter
} from '../controller/chapters.js';
import protect from '../middleware/authMiddleware.js';
import { uploadMemory } from '../middleware/upload.js';
import {optionalAuth} from '../middleware/optionalAuth.js'
const router = express.Router();

/**
 * 1. UPLOAD ROUTE (Protected)
 * Uses .array() because chapters have multiple pages
 */
router.post('/upload', protect, uploadMemory.array('pages', 50), uploadChapter);

/**
 * 2. LIST ROUTE
 * Gets the list of chapters for a specific manga
 * Supports both /content/:mangaId and /:mangaId for flexibility
 */
router.get('/:mangaId', getChapterContent);
router.get('/content/:mangaId', getChapterContent);

/**
 * 3. DETAIL ROUTE
 * Gets the actual images/pages for a specific chapter number
 */
router.get('/:mangaId/index/:chapterNum',optionalAuth, getChapterDetails);

/**
 * 4. DELETE ROUTE (Protected)
 * Deletes a specific chapter and decrements manga chapter count
 */
router.delete('/:mangaId/:chapterId', protect, deleteChapter);

/**
 * 5. EDIT ROUTE (Protected)
 * Edits chapter details (title, chapterNumber)
 */
router.patch('/:chapterId', protect, editChapter);

export default router;