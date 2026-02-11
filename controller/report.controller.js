import Report from "../model/Report.js";
import User from "../model/User.js";
import Manga from "../model/Manga.js";
import Comment from "../model/Comment.js";
import Chapter from "../model/Chapter.js";

export const createReport = async (req, res) => {
  try {
    const { 
      targetId, targetType, reason, details, 
      targetUser, parentManga, chapterNumber 
    } = req.body;
    console.log(req.body);
    
    const reporterId = req.user.id;

    // 1. Prevent self-reporting
    if (reporterId === targetUser) {
      return res.status(400).json({ message: "You cannot report yourself." });
    }

    // 2. DUPLICATE CHECK: Has this user already reported this specific item?
    const existingReport = await Report.findOne({ 
      reporter: reporterId, 
      targetId: targetId 
    });

    if (existingReport) {
      return res.status(400).json({ 
        message: "You have already submitted a report for this content. Our team is reviewing it." 
      });
    }

    // 3. Dynamic Model Validation
    const modelMap = { manga: Manga, comment: Comment, chapter: Chapter };
    const targetData = await modelMap[targetType].findById(targetId);
    
    if (!targetData) {
      return res.status(404).json({ message: `Target ${targetType} not found.` });
    }

    // 4. Create the Report
    const newReport = await Report.create({
      reporter: reporterId,
      targetUser,
      reason,
      details,
      targetId,
      targetType,
      parentManga,
      chapterNumber,
      status: "pending"
    });

    // 5. Penalize/Mark target user
    await User.findByIdAndUpdate(targetUser, { $inc: { reports: 1 } });

    res.status(201).json({ message: "Report logged successfully.", report: newReport });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporter", "username email")
      .populate("targetUser", "username email reports")
      .populate("parentManga", "title")
      .sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const handleReportAction = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, adminNote } = req.body; // action: 'resolved' | 'dismissed' | 'investigating'

    // 1. Find the report and ensure it exists
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: "Report not found" });

    // 2. Prevent redundant processing 
    // (If it was already dismissed, don't decrease the count again)
    const previousStatus = report.status;

    // 3. Update Report Status
    report.status = action;
    if (adminNote) report.adminNote = adminNote; 
    await report.save();
    if (action === 'dismissed' && previousStatus !== 'dismissed') {
      await User.findByIdAndUpdate(report.targetUser, { 
        $inc: { reports: -1 } 
      });
      
      // Safety check: ensure report count doesn't go below 0
      await User.updateOne(
        { _id: report.targetUser, reports: { $lt: 0 } },
        { $set: { reports: 0 } }
      );
    }

    res.status(200).json({ 
      message: `Report marked as ${action}`,
      newStatus: action 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const clearProcessedReports = async (req, res) => {
  try {
    // Only delete reports that are no longer active
    const result = await Report.deleteMany({ 
      status: { $in: ['resolved', 'dismissed'] } 
    });

    res.status(200).json({ 
      message: `System Purge Complete: ${result.deletedCount} reports removed.`,
      count: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};