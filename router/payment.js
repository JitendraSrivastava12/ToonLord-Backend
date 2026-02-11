import express from 'express';
import { createCheckoutSession, verifyPayment } from '../controller/Payment.controller.js';

const router = express.Router();

/**
 * @route   POST /api/payments/create-checkout-session
 * @desc    Initializes the Stripe Checkout flow and returns a redirect URL
 * @access  Private (Ensure you have your auth middleware here)
 */
router.post('/create-checkout-session', createCheckoutSession);

/**
 * @route   GET /api/payments/verify/:sessionId
 * @desc    Verifies the Stripe session status and updates User Wallet/Transactions
 * @access  Private
 */
router.get('/verify/:sessionId', verifyPayment);

export default router;