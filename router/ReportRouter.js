import express from 'express';
import { 
  createReport, 
  getAllReports, 
  handleReportAction ,clearProcessedReports,getMyReports
} from '../controller/report.controller.js';
import protect from '../middleware/authMiddleware.js';
import admin from '../middleware/adminMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/reports
 * @desc    Submit a new report (Manga, Comment, or User)
 * @access  Private (Any logged-in user)
 */
router.use(protect);
router.post('/submit', createReport);

/**
 * @route   GET /api/reports/admin/all
 * @desc    Fetch all reports for the management dashboard
 * @access  Private/Admin
 */router.get('/my-reports', protect, getMyReports);
router.get('/admin/all',  admin, getAllReports);

/**
 * @route   PATCH /api/reports/admin/:reportId
 * @desc    Resolve or Dismiss a specific report
 * @access  Private/Admin
 */
router.patch('/admin/:reportId',  admin, handleReportAction);
router.delete('/admin/clear-processed', admin, clearProcessedReports)

export default router;