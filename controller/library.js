import User from "../model/User.js";
export const getLibrary = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'library.manga',
            model: 'manga'
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Filter nulls and return valid items
        const validLibrary = user.library.filter(item => item.manga !== null);
        res.status(200).json(validLibrary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
import mongoose from "mongoose";

export const updateLibraryItem = async (req, res) => {
  const { mangaId, mangaTitle, status, progress, rating } = req.body;

  try {
    const userId = req.user.id;
    const mId = new mongoose.Types.ObjectId(mangaId);

    // 1. Find User
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Remove any existing occurrence of this manga
    // This handles the "Delete previous occurrence" requirement
    user.library = user.library.filter(item => item.manga.toString() !== mId.toString());

    // 3. Create the new Library Item
    const newItem = {
      manga: mId,
      status: status || 'Reading',
      progress: progress || 1,
      rating: rating || 0,
      lastReadAt: new Date()
    };

    // 4. Add to the FRONT of the array
    user.library.unshift(newItem);

    // 5. Update Activity Log
    user.activityLog.push({
      type: 'bookmark',
      description: `Updated ${mangaTitle}`,
      mangaTitle: mangaTitle,
      timestamp: new Date()
    });

    // 6. SAVE - markModified is used because library is an array of subdocuments
    user.markModified('library');
    await user.save();

    // 7. POPULATE with the EXACT model name used in your Manga schema ('manga')
    const populatedUser = await User.findById(userId).populate({
      path: 'library.manga',
      model: 'manga' // MUST match the name in your Manga model export
    });

    res.status(200).json(populatedUser.library);
  } catch (error) {
    console.error("LIBRARY UPDATE ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};