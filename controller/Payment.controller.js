import Stripe from 'stripe';
import User from '../model/User.js';
import Wallet from '../model/Wallet.js';
import Transaction from '../model/Transaction.js';

// Initialize Stripe with your Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 1. CREATE CHECKOUT SESSION (POST)
export const createCheckoutSession = async (req, res) => {
  const { priceAmount, coins, userId } = req.body;

  try {
    // Stripe requires a minimum of roughly ₹50 for INR transactions
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
          unit_amount: validAmount * 100, // Convert to Paisa
        },
        quantity: 1,
      }],
      mode: 'payment',
      // The {CHECKOUT_SESSION_ID} is a template Stripe fills automatically
      success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/coin-shop`,
      // IMPORTANT: Metadata is what links the payment back to your database
      metadata: {
        userId: userId.toString(),
        coins: coins.toString(),
      },
    });

    // Return the URL for the frontend to redirect
    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Session Error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// 2. VERIFY PAYMENT & UPDATE DB (GET)
export const verifyPayment = async (req, res) => {
  const { sessionId } = req.params;

  try {
    // 1. Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: "Payment not verified." });
    }

    // 2. Idempotency Check: Prevent duplicate coin additions if user refreshes success page
    const existingTx = await Transaction.findOne({ externalTransactionId: sessionId });
    if (existingTx) {
      // Find the wallet to return current balance
      const wallet = await Wallet.findOne({ userId: session.metadata.userId });
      return res.json({ 
        success: true, 
        message: "Already processed", 
        coins: wallet.toonCoins ,
        coinsPurchased: session.metadata.coins
      });
    }

    const userId = session.metadata.userId;
    const coinsToGained = parseInt(session.metadata.coins);

    // 3. Update Wallet Balance
    const wallet = await Wallet.findOneAndUpdate(
      { userId: userId },
      { 
        $inc: { toonCoins: coinsToGained }, 
        lastTransactionAt: Date.now() 
      },
      { new: true }
    );

    // 4. Create Transaction Record
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

    // 5. Update User Activity Log
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLog: {
          category: 'system',
          type: 'coins_earned',
          description: `Successfully added ${coinsToGained} ToonCoins to your vault.`
        }
      }
    });

    res.json({ success: true, coins: wallet.toonCoins });

  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};