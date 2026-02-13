import express from 'express';
const router = express.Router();
import protect  from '../middleware/authMiddleware.js';
import { unlockManga } from '../controller/transaction.js';

// --- ECONOMY ROUTES ---

// 1. Reader spends coins to unlock a premium series
router.post('/unlock/:mangaId', protect, unlockManga);

export default router;