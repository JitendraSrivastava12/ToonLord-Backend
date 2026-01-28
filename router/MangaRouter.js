import express from 'express';
const router = express.Router();
import { getGeneralManga, getAdultManga, getMangaById } from '../controller/mangas.js';

// Friendly/General Route
router.get('/general', getGeneralManga);

// Adult/Pornwah Route
router.get('/adult', getAdultManga);

// Individual Details
router.get('/:id', getMangaById);
export default router;
