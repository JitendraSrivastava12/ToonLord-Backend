import User from "../model/User.js";
import mongoose from "mongoose";
import Manga from "../model/Manga.js";

// GET: Fetch all library items
export const getLibrary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'library.manga',
      model: 'manga',
      select: 'title coverImage genres totalChapters'
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const activeLibrary = user.library.filter(item => item.manga !== null);
    res.status(200).json(activeLibrary);
  } catch (error) {
    res.status(500).json({ message: "Error fetching library", error: error.message });
  }
};

// UPDATE: Add or Update Library Item
export const updateLibraryItem = async (req, res) => {
  const { mangaId, status, progress, totalChapters, rating, currentchapter } = req.body;
  const userId = req.user.id;

  if (!mangaId || !mongoose.Types.ObjectId.isValid(mangaId)) {
    return res.status(400).json({ message: "Invalid or missing Manga ID" });
  }

  try {
    const mId = new mongoose.Types.ObjectId(mangaId);
    
    const userDoc = await User.findById(userId);
    const mg = await Manga.findById(mangaId);
    if (!userDoc || !mg) return res.status(404).json({ message: "User or Manga not found" });

    // Check if THIS SPECIFIC status already exists for this manga
    const existingEntry = userDoc.library.find(
      item => item.manga.toString() === mId.toString() && item.status === status
    );

    // TOGGLE LOGIC: Remove only if the user clicks the EXACT same category twice
    if (existingEntry && status !== 'Reading') {
        return removeFromLibrary(req, res); 
    }

    const updatedItem = {
      manga: mId,
      status: status || 'Reading',
      progress: progress ?? (existingEntry ? existingEntry.progress : 0),
      totalChapters: totalChapters ?? (existingEntry ? existingEntry.totalChapters : mg.totalChapters || 0),
      rating: rating ?? (existingEntry ? existingEntry.rating : 0),
      currentchapter: currentchapter || (existingEntry ? existingEntry.currentchapter : 1),
      lastReadAt: new Date()
    };

    // --- NEW: Handle Subscription Logic in Manga Schema ---
    if (status === 'Subscribe') {
        await Manga.findByIdAndUpdate(mId, { $addToSet: { subscribers: userId } });
    }

    const logType = updatedItem.status;
    const newActivity = {
      category: 'reader',
      type: logType,
      description: logType === 'Reading' 
        ? `You were reading Chapter ${updatedItem.currentchapter} of ${mg.title}` 
        : `You added ${mg.title} to your ${logType}s`,
      mangaId: mId,
      isRead: true,
      timestamp: new Date()
    };

    // Atomic Update: Remove matching status first to prevent duplicates
    await User.updateOne(
      { _id: userId },
      {
        $pull: { 
            library: { manga: mId, status: logType },
            activityLog: { mangaId: mId, type: logType } 
        }
      }
    );

    await User.findByIdAndUpdate(
      userId,
      {
        $push: { 
          library: { $each: [updatedItem], $position: 0 },
          activityLog: { $each: [newActivity], $position: 0, $slice: 100 }
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      item: updatedItem,
      action: 'pushed'
    });

  } catch (error) {
    console.error("Library Update Error:", error);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

// REMOVE: Separate function to remove library item
export const removeFromLibrary = async (req, res) => {
  const { mangaId, status } = req.body;
  const userId = req.user.id;

  try {
    const mId = new mongoose.Types.ObjectId(mangaId);

    // --- NEW: Remove from Manga subscribers array if status is Subscribe ---
    if (status === 'Subscribe') {
        await Manga.findByIdAndUpdate(mId, { $pull: { subscribers: userId } });
    }

    // Atomic Pull: Removes the item and returns the updated document
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: { 
          library: { manga: mId, status: status },
          activityLog: { mangaId: mId, type: status }
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Removed from ${status}`,
      action: 'pulled'
    });
  } catch (error) {
    res.status(500).json({ message: "Removal failed", error: error.message });
  }
};