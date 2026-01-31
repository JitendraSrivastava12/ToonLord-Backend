// @desc    Update Status or Progress
// @route   POST /api/library/update
import User from "../model/User.js";
export const updateLibraryItem = async (req, res) => {
  const { mangaId, mangaTitle, status, progress, rating } = req.body;

  try {
    const user = await User.findById(req.user.id);
    const itemIndex = user.library.findIndex(item => item.manga.toString() === mangaId);

    if (itemIndex > -1) {
      // 1. Logic for "Reading", "Completed", "Dropped", "Plan to Read", "On Hold"
      const oldStatus = user.library[itemIndex].status;
      
      if (status && oldStatus !== status) {
        user.library[itemIndex].status = status;
        
        // Add specific activity text for the Activity Bar
        let activityMsg = `Moved ${mangaTitle} to ${status}`;
        if(status === 'Completed') activityMsg = `🚩 Finished reading ${mangaTitle}!`;
        if(status === 'Dropped') activityMsg = `💔 Dropped ${mangaTitle}`;
        
        user.activityLog.push({
          type: 'achievement',
          description: activityMsg,
          timestamp: new Date()
        });
      }

      // 2. Update other fields if they were sent in the request
      if (progress !== undefined) user.library[itemIndex].progress = progress;
      if (rating !== undefined) user.library[itemIndex].rating = rating;
      
      user.library[itemIndex].lastReadAt = Date.now();

    } else {
      // 3. If it's not in the library yet (Defaults to "Reading" or "Plan to Read")
      user.library.push({
        manga: mangaId,
        status: status || 'Reading',
        progress: progress || 0,
      });

      user.activityLog.push({
        type: 'bookmark',
        description: `Added ${mangaTitle} to your ${status || 'Reading'} list`,
        timestamp: new Date()
      });
    }

    // Limit log size to 20 for performance
    if (user.activityLog.length > 20) user.activityLog.shift();

    await user.save();
    res.status(200).json({ success: true, library: user.library });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};