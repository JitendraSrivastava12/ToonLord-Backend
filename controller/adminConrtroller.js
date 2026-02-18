import PremiumRequest from "../model/PremiumRequest.js";
import User from '../model/User.js';
import Transaction from '../model/Transaction.js';
import Manga from "../model/Manga.js";
import Report from '../model/Report.js';

export const getPremiumQueue = async (req, res) => {
  const queue = await PremiumRequest.find({ status: 'pending' })
    .populate('manga', 'title views TotalChapter coverImage')
    .populate('creator', 'username email');
  res.status(200).json(queue);
};

export const sendContractOffer = async (req, res) => {
  const { requestId, offeredPrice } = req.body;
  const request = await PremiumRequest.findById(requestId);
  
  await Manga.findByIdAndUpdate(request.manga, {
    premiumRequestStatus: 'contract_offered',
    pendingPrice: offeredPrice
  });

  request.status = 'contract_offered';
  request.adminOffer.price = offeredPrice;
  await request.save();

  res.status(200).json({ message: "Offer sent to creator." });
};

export const getAllContracts = async (req, res) => {
  try {
    const allContracts = await PremiumRequest.find()
      .populate('manga', 'title coverImage')
      .populate('creator', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json(allContracts);
  } catch (err) {
    res.status(500).json({ message: "Legal database synchronization error" });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    console.log("Admin Dashboard Request Received (Full Revenue Data)...");

    const USD_TO_INR = 83; // Current conversion rate

    const [
      totalUsers, 
      vipUsersCount, 
      allTransactions, 
      pendingReports, 
      activeRequests
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'vipStatus.isVip': true }),
      Transaction.find().populate('userId', 'username'),
      Report.countDocuments({ status: 'pending' }),
      PremiumRequest.countDocuments({ status: 'pending' })
    ]);

    // 1. Calculate Total Platform Revenue (Normalized to INR)
    const totalRevenueINR = allTransactions.reduce((sum, t) => {
      let amount = 0;
      
      // Full amount for VIP, platform fee for Manga unlocks
      if (t.type === 'VIP_PURCHASE') {
        amount = (Number(t.amount) || 0);
      } else {
        amount = (Number(t.platformFee) || 0);
      }

      // Convert USD values to INR for the grand total
      if (t.currency?.toLowerCase() === 'usd') {
        return sum + (amount * USD_TO_INR);
      }
      return sum + amount;
    }, 0);

    // 2. Count Sales Types
    const mangaSalesCount = allTransactions.filter(t => t.type === 'MANGA_UNLOCK').length;
    const vipSalesCount = allTransactions.filter(t => t.type === 'VIP_PURCHASE').length;

    // 3. Generate Monthly Revenue Chart Data (ACTUAL VALUES)
    const monthlyRevenue = new Array(12).fill(0);
    allTransactions.forEach(t => {
      if (t.createdAt) {
        const month = new Date(t.createdAt).getMonth();
        let revenueAmount = t.type === 'VIP_PURCHASE' ? (Number(t.amount) || 0) : (Number(t.platformFee) || 0);
        
        // Convert to INR so the chart scale is mathematically correct
        if (t.currency?.toLowerCase() === 'usd') {
          revenueAmount *= USD_TO_INR;
        }
        
        // Add the actual cash value to that month's total
        monthlyRevenue[month] += Math.round(revenueAmount);
      }
    });

    // 4. Recent Activity Formatting
    const activity = allTransactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(t => ({
        id: t._id,
        event: t.description || `${t.type.replace('_', ' ')} processed`,
        user: t.userId?.username || 'Guest',
        displayAmount: t.currency?.toLowerCase() === 'usd' ? `$${t.amount}` : `₹${t.amount}`,
        time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        status: t.status || 'Done',
        type: t.type === 'VIP_PURCHASE' ? 'vip' : (t.type === 'MANGA_UNLOCK' ? 'success' : 'warning')
      }));

    // 5. Response payload
    res.json({
      stats: {
        totalRevenue: `₹${Math.round(totalRevenueINR).toLocaleString()}`, 
        activeUsers: totalUsers.toLocaleString(),
        vipSubscribers: vipUsersCount.toLocaleString(),
        salesCount: (mangaSalesCount + vipSalesCount).toLocaleString(),
        reportsPending: pendingReports,
        premiumRequests: activeRequests
      },
      chartData: monthlyRevenue, // Returns [5000, 12000, 0, 0...] instead of percentages
      activity
    });

  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    res.status(500).json({ error: error.message });
  }
};
// NEW: Dedicated Analytics Engine
export const getGlobalAnalytics = async (req, res) => {
  try {
    const USD_TO_INR = 83;

    // 1. Calculate Monthly Growth (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 2. Genre Popularity (Sector Load)
    const genreDistribution = await Manga.aggregate([
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // 3. VIP vs Regular Neural Split
    const userSplit = await User.aggregate([
      {
        $group: {
          _id: "$vipStatus.isVip",
          count: { $sum: 1 }
        }
      }
    ]);

    // 4. Financial Flux (Coins vs VIP Revenue)
    const financialFlux = await Transaction.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    // Format months for Recharts [ { name: 'Jan', signups: 10 }, ... ]
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedGrowth = userGrowth.map(item => ({
      name: monthNames[item._id - 1],
      signups: item.count
    }));

    res.status(200).json({
      success: true,
      growthTimeline: formattedGrowth,
      genreStats: genreDistribution.map(g => ({ name: g._id || "Unknown", value: g.count })),
      userSplit: {
        vip: userSplit.find(u => u._id === true)?.count || 0,
        regular: userSplit.find(u => u._id === false)?.count || 0
      },
      revenueSplit: financialFlux.map(f => ({ type: f._id, value: f.total }))
    });

  } catch (err) {
    console.error("Neural Analytics Error:", err);
    res.status(500).json({ message: "Analytics synchronization failed", error: err.message });
  }
};
export const getAllLogs = async (req, res) => {
  try {
    // Fetch all transactions, sorted by most recent first
    const logs = await Transaction.find()
      .populate('userId', 'username email profilePicture')
      .sort({ createdAt: -1 });

    // Format the data to match the frontend expectations
    const formattedLogs = logs.map(t => ({
      id: t._id,
      event: t.description || `${t.type.replace('_', ' ')} processed`,
      user: t.userId?.username || 'Guest',
      email: t.userId?.email || 'N/A',
      avatar: t.userId?.profilePicture || null,
      amount: t.currency?.toLowerCase() === 'usd' ? `$${t.amount}` : `₹${t.amount}`,
      time: new Date(t.createdAt).toLocaleString(),
      status: t.status || 'Completed',
      type: t.type === 'VIP_PURCHASE' ? 'vip' : (t.type === 'MANGA_UNLOCK' ? 'success' : 'warning')
    }));

    res.status(200).json(formattedLogs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Failed to retrieve logs from archive." });
  }
};
import GlobalSetting from "../model/GlobalStorage.js";

// GET the current status for the NavBar
export const getRedModeStatus = async (req, res) => {
  try {
    const setting = await GlobalSetting.findOne({ key: 'red_mode_disabled' });
    res.status(200).json({ isDisabled: setting ? setting.value : false });
  } catch (error) {
    res.status(500).json({ message: "Error fetching setting" });
  }
};

// PATCH the status from the Admin Panel
export const updateRedModeStatus = async (req, res) => {
  try {
    const { isDisabled } = req.body;
    const updatedSetting = await GlobalSetting.findOneAndUpdate(
      { key: 'red_mode_disabled' },
      { value: isDisabled },
      { upsert: true, new: true }
    );
    res.status(200).json(updatedSetting);
  } catch (error) {
    res.status(500).json({ message: "Error updating setting" });
  }
};