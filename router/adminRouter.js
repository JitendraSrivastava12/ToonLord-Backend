import express from 'express';
import  adminLogin  from '../controller/adminlogin.controller.js';
import { getAllContracts, getPremiumQueue, sendContractOffer,getAdminStats ,getGlobalAnalytics, getAllLogs,getRedModeStatus,updateRedModeStatus} from '../controller/adminConrtroller.js';
import admin from '../middleware/adminMiddleware.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Publicly accessible route, but logically restricted by the controller
router.post('/admin-login', adminLogin);
router.get('/premium-queue', protect, admin, getPremiumQueue);

// 2. Review a request and send an offer (Price) to the creator
router.post('/issue-contract', protect, admin, sendContractOffer);
router.get('/all-contracts', protect, admin, getAllContracts);
router.get('/stats', protect, admin, getAdminStats);
router.get('/analytics/global', protect, admin, getGlobalAnalytics);
router.get('/logs', protect, admin, getAllLogs);
router.get('/red-mode', getRedModeStatus);

/**
 * @route   PATCH /api/settings/red-mode
 * @desc    Toggle Red Mode visibility (Admin Only)
 */
router.patch('/red-mode', protect, admin, updateRedModeStatus);
export default router;