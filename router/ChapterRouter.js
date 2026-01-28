import express from 'express';
import {
    getMangaChapters,
    getChapterDetails,
    getChapterContent
} from '../controller/chapters.js';

const router = express.Router();

// 1. Move static/specific routes to the TOP
router.get('/content/:mangaId', getChapterContent);

// 2. Keep dynamic routes at the BOTTOM
router.get('/:mangaId', getMangaChapters);

// 3. This route is now safe because /content/ will match above first
router.get('/:mangaId/index/:chapterNum', getChapterDetails);

export default router;