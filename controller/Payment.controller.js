import Stripe from 'stripe';
import User from '../model/User.js';
import Wallet from '../model/Wallet.js';
import Transaction from '../model/Transaction.js';

// Load Stripe with Environment Variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use Environment Variables for Price IDs
const VIP_PLAN_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  quarterly: process.env.STRIPE_PRICE_QUARTERLY,
  'half-yearly': process.env.STRIPE_PRICE_HALF_YEARLY,
  yearly: process.env.STRIPE_PRICE_YEARLY
};

const CLIENT_URL = process.env.CLIENT_URL;

// 1. CREATE CHECKOUT SESSION FOR COINS
export const createCheckoutSession = async (req, res) => {
  const { priceAmount, coins, userId } = req.body;
  try {
    const validAmount = Math.max(priceAmount, 50);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: {
            name: `${coins} ToonCoins`,
            description: 'Digital currency for ToonLord Manga Reader',
          },
          unit_amount: validAmount * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&mode=coins`,
      cancel_url: `${CLIENT_URL}/coin-shop`,
      metadata: {
        userId: userId.toString(),
        coins: coins.toString(),
        paymentType: 'COINS'
      },
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 2. CREATE CHECKOUT SESSION FOR VIP
export const createVipSession = async (req, res) => {
  const { plan, userId } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: VIP_PLAN_PRICES[plan],
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&mode=vip`,
      cancel_url: `${CLIENT_URL}/subscription`,
      metadata: {
        userId: userId.toString(),
        planType: plan,
        paymentType: 'VIP_SUBSCRIPTION'
      },
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// 3. VERIFY PAYMENT & UPDATE DB
export const verifyPayment = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: "Payment not verified." });
    }

    const userId = session.metadata.userId;
    const paymentType = session.metadata.paymentType;

    // Idempotency: Prevent duplicate processing
    const existingTx = await Transaction.findOne({ externalTransactionId: sessionId });
    if (existingTx) {
      const user = await User.findById(userId);
      return res.json({ success: true, message: "Already processed", vip: user.vipStatus });
    }

    // --- LOGIC A: HANDLE TOONCOINS ---
    if (paymentType === 'COINS') {
      const coinsToGained = parseInt(session.metadata.coins);
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { toonCoins: coinsToGained }, lastTransactionAt: Date.now() },
        { new: true }
      );

      await Transaction.create({
        userId,
        type: 'COIN_PURCHASE',
        currency: 'toonCoins',
        amount: coinsToGained,
        direction: 'in',
        description: `Purchased ${coinsToGained} ToonCoins via Stripe`,
        externalTransactionId: sessionId,
        status: 'completed'
      });

      await User.findByIdAndUpdate(userId, {
        $push: { 
          activityLog: { 
            category: 'system', 
            type: 'coins_earned', 
            description: `Successfully added ${coinsToGained} ToonCoins to your vault.` 
          } 
        }
      });

      return res.json({ success: true, coins: wallet.toonCoins });
    }

    // --- LOGIC B: HANDLE VIP SUBSCRIPTION (System Revenue) ---
    if (paymentType === 'VIP_SUBSCRIPTION') {
      const plan = session.metadata.planType;
      let expiryDate = new Date();
      let bonusCredits = 0;

      if (plan === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
      else if (plan === 'quarterly') expiryDate.setMonth(expiryDate.getMonth() + 3);
      else if (plan === 'half-yearly') expiryDate.setMonth(expiryDate.getMonth() + 6);
      else if (plan === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        bonusCredits = 2; // GRANT 2 BONUS UNLOCKS FOR ANNUAL
      }

      const updatedUser = await User.findByIdAndUpdate(userId, {
        $set: {
          'vipStatus.isVip': true,
          'vipStatus.plan': plan,
          'vipStatus.expiresAt': expiryDate,
        },
        $inc: { 'vipStatus.freeMangaCredits': bonusCredits },
        $push: {
          activityLog: {
            category: 'system',
            type: 'vip_activated',
            description: `VIP Activated! ${plan.toUpperCase()} plan active until ${expiryDate.toLocaleDateString()}.`
          }
        }
      }, { new: true });

      // Transaction Record (100% Platform Revenue)
      await Transaction.create({
        userId,
        type: 'VIP_PURCHASE',
        amount: parseFloat(session.amount_total / 100),
        currency: session.currency.toLowerCase(), // Store as 'inr' or 'usd'
        direction: 'in',
        description: `Purchased ToonLord VIP: ${plan} Plan`,
        externalTransactionId: sessionId,
        status: 'completed',
        revenueSplitRatio: 100, // 100% to system
        netEarning: parseFloat(session.amount_total / 100)
      });

      return res.json({ success: true, vip: updatedUser.vipStatus });
    }

  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};