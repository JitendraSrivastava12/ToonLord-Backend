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
// adminController.js
export const getAllContracts = async (req, res) => {
  try {
    // Get all premium requests regardless of status
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
    // Debug: Check if the route is even being hit
    console.log("Admin Dashboard Request Received...");

    const [
      totalUsers, 
      allTransactions, 
      pendingReports, 
      activeRequests
    ] = await Promise.all([
      User.countDocuments(),
      Transaction.find(), // Get all transactions to calculate revenue
      Report.countDocuments({ status: 'pending' }),
      PremiumRequest.countDocuments({ status: 'pending' })
    ]);

    // Debug logs to your terminal
    console.log(`Users: ${totalUsers}, Transactions: ${allTransactions.length}, Reports: ${pendingReports}`);

    // 1. Calculate Revenue from platformFee field
    const totalRevenue = allTransactions.reduce((sum, t) => {
      return sum + (Number(t.platformFee) || 0);
    }, 0);

    // 2. Calculate Sales (Matches your Transaction Schema enum 'MANGA_UNLOCK')
    const salesCount = allTransactions.filter(t => t.type === 'MANGA_UNLOCK').length;

    // 3. Generate Chart Data (Normalize to percentages for the UI bars)
    const monthlyRevenue = new Array(12).fill(0);
    allTransactions.forEach(t => {
      if (t.createdAt) {
        const month = new Date(t.createdAt).getMonth();
        monthlyRevenue[month] += (Number(t.platformFee) || 0);
      }
    });
    const maxRev = Math.max(...monthlyRevenue, 1);
    const chartData = monthlyRevenue.map(v => Math.round((v / maxRev) * 100));

    // 4. Recent Activity (Populate ensures we get the username)
    const recentActivityRaw = await Transaction.find()
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .limit(5);

    const activity = recentActivityRaw.map(t => ({
      id: t._id,
      event: t.description || `Transaction: ${t.type}`,
      user: t.userId?.username || 'Guest',
      time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
      status: t.status || 'Done',
      type: t.type === 'MANGA_UNLOCK' ? 'success' : 'warning'
    }));

    res.json({
      stats: {
        totalRevenue: `${totalRevenue.toLocaleString()}`,
        activeUsers: totalUsers.toLocaleString(),
        salesCount: salesCount.toLocaleString(),
        reportsPending: pendingReports,
        premiumRequests: activeRequests
      },
      chartData,
      activity
    });

  } catch (error) {
    console.error("Dashboard Logic Error:", error);
    res.status(500).json({ error: error.message });
  }
};