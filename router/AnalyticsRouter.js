import express from 'express';
import { 
  logReadingActivity, 
  getReadingAnalytics 
} from '../controller/readinglog.controller.js';
import protect  from '../middleware/authMiddleware.js'; // Adjust path to your actual auth middleware

const router = express.Router();

/**
 * @route   POST /api/analytics/log
 * @desc    Log a new reading session (chapter completion)
 * @access  Private
 */
router.post('/log', protect, logReadingActivity);

/**
 * @route   GET /api/analytics/my-stats
 * @desc    Get aggregated data for the Analytics Dashboard
 * @access  Private
 */
router.get('/mystats', protect, getReadingAnalytics);

export default router;