import express from 'express';
import  adminLogin  from '../controller/adminlogin.controller.js';
import { getAllContracts, getPremiumQueue, sendContractOffer,getAdminStats } from '../controller/adminConrtroller.js';
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
export default router;