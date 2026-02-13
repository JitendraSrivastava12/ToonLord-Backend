import express from 'express';
import { 
  createSeries, 
  getMangas, 
  getMangaCounts,
  getMangaById, 
  deleteManga,
  getSearchSuggestions,
  updateManga,
  adminDeleteManga,
  adminUpdateManga,
  adminGetAllMangas,requestPremium,acceptContract,
  declineContract
} from '../controller/mangas.js';
import protect from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';
import admin from '../middleware/adminMiddleware.js';

const router = express.Router();

// --- 1. STATIC & SEARCH ROUTES (Must come before /:id) ---
router.get('/counts', getMangaCounts);
router.get('/search/suggestions', getSearchSuggestions);

router.get('/general', (req, res) => {
    req.query.type = 'general';
    getMangas(req, res);
});

router.get('/adult', (req, res) => {
    req.query.type = 'adult';
    getMangas(req, res);
});

// --- 2. ADMIN ROUTES (Must come before /:id) ---
// If /:id was above this, /admin/all would be treated as ID="admin"
router.get('/admin/all', protect,admin ,adminGetAllMangas);
router.put('/admin/:id',protect, admin, upload.single('coverImage'), adminUpdateManga);
router.delete('/admin/:id',protect, admin, adminDeleteManga);

// --- 3. SPECIFIC RESOURCE ROUTES (:id) ---
router.get('/:id', getMangaById);

// --- 4. PROTECTED USER/CREATOR ACTIONS ---
router.post('/', protect, upload.single('coverImage'), createSeries);
router.patch('/:id', protect, upload.single('coverImage'), updateManga); // Standard update
router.delete('/:id', protect, deleteManga);

router.post('/request-premium/:id', protect, requestPremium);

// 2. Creator accepts the Admin's offer
router.post('/accept-contract/:id', protect, acceptContract);
router.post('/decline-contract/:id', protect, declineContract);

export default router;