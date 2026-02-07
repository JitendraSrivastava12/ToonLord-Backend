import express from 'express';
import { 
  createSeries, 
  getMangas, 
  getMangaCounts,
  getMangaById, 
  deleteManga ,
  getSearchSuggestions,
  updateManga
} from '../controller/mangas.js';
import protect from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Option A: If you want to keep your specific /general and /adult paths
router.get('/general', (req, res) => {
    req.query.type = 'general'; // Force the type
    getMangas(req, res);
});

// Debug: counts of adult vs general
router.get('/counts', getMangaCounts);

router.get('/adult', (req, res) => {
    req.query.type = 'adult'; // Force the type
    getMangas(req, res);
});
router.get('/search/suggestions', getSearchSuggestions);
// Individual Details
router.get('/:id', getMangaById);


// Protected Actions
router.post('/', protect, upload.single('coverImage'), createSeries);
router.delete('/:id', protect, deleteManga);

export default router;