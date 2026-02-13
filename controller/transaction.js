import Wallet from "../model/Wallet.js";
import Transaction from "../model/Transaction.js";
import User from "../model/User.js";
import Manga from "../model/Manga.js";

export const unlockManga = async (req, res) => {
  try {
    const { mangaId } = req.params;
    const userId = req.user.id;

    // 1. Fetch Reader data and Manga
    const manga = await Manga.findById(mangaId);
    if (!manga) return res.status(404).json({ message: "Manga not found" });

    const [user, readerWallet] = await Promise.all([
      User.findById(userId),
      Wallet.findOne({ userId })
    ]);

    // 2. Check if already owned
    const isAlreadyOwned = user.unlockedContent.some(
      (item) => item.manga.toString() === mangaId
    );
    if (isAlreadyOwned) return res.status(400).json({ message: "Already unlocked" });

    // 3. Check balance
    if (readerWallet.toonCoins < manga.price) {
      return res.status(400).json({ message: "Insufficient toonCoins in wallet." });
    }

    // 4. Calculations (70/30 Split)
    const creatorShare = Math.floor(manga.price * 0.7);
    const platformFee = manga.price - creatorShare;

    // 5. FIND AND UPDATE CREATOR & ADMIN WALLETS
    // Fetch Creator's wallet using the uploader ID from Manga schema
    const creatorWallet = await Wallet.findOne({ userId: manga.uploader });
    
    // Fetch Admin Wallet (You can define a specific Admin ID or look for role: 'admin')
    const adminUser = await User.findOne({ role: 'admin' });
    const adminWallet = await Wallet.findOne({ userId: adminUser._id });

    // 6. Execute Currency Transfers
    readerWallet.toonCoins -= manga.price;
    
    if (creatorWallet) {
      creatorWallet.creatorEarnings.pendingBalance += creatorShare;
      creatorWallet.creatorEarnings.totalLifeTimeEarnings += creatorShare;
    }

    if (adminWallet) {
      adminWallet.toonCoins += platformFee; // Platform earning added to Admin's coin balance
    }

    // 7. Update User's Library
    user.unlockedContent.push({ 
      manga: mangaId, 
      amountSpent: manga.price,
      unlockedAt: new Date()
    });

    // 8. Log Transaction
    await Transaction.create({
      userId,
      type: 'MANGA_UNLOCK',
      currency: 'toonCoins',
      amount: manga.price,
      direction: 'out',
      description: `Unlocked full access to ${manga.title}`,
      platformFee,
      netEarning: creatorShare,
      relatedManga: mangaId,
      beneficiaryId: manga.uploader,
      status: 'completed'
    });

    // 9. Atomic Save
    await Promise.all([
      readerWallet.save(),
      user.save(),
      creatorWallet?.save(),
      adminWallet?.save()
    ]);

    res.status(200).json({ 
      success: true, 
      message: "Neural Archive Unlocked.", 
      newBalance: readerWallet.toonCoins 
    });

  } catch (err) {
    console.error("Unlock error:", err);
    res.status(500).json({ error: err.message });
  }
};