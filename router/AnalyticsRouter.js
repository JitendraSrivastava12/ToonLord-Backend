import express from 'express';
import { getReadingAnalytics, syncHeartbeat } from '../controller/analyticsController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Route for the Frontend Analytics Page
// Matches: GET http://localhost:5000/api/analytics/mystats
router.get('/mystats', protect, getReadingAnalytics);

// Route for the Reader Heartbeat
// Matches: POST http://localhost:5000/api/analytics/heartbeat
router.post('/heartbeat', protect, syncHeartbeat);

export default router;