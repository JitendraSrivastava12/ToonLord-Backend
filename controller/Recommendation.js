import Manga from '../model/Manga.js';

// 1. CONTENT-BASED (For the Manga Detail Page)
// Shows manga similar to the one being viewed
export const getRelatedManga = async (req, res) => {
  try {
    const { id } = req.params;
    const currentManga = await Manga.findById(id);

    if (!currentManga) return res.status(404).json({ message: "Manga not found" });

    // Clean the description to use as a search query
    // We take the first few words or the whole thing to find similar plot points
    const searchQuery = currentManga.title + " " + currentManga.description;

    const recommendations = await Manga.aggregate([
      {
        $match: {
          _id: { $ne: currentManga._id },
          isAdult: currentManga.isAdult,
          // Finds manga with similar words in title/description
          $text: { $search: searchQuery } 
        }
      },
      {
        $addFields: {
          // 1. Tag Similarity (Intersection of arrays)
          tagScore: { $size: { $setIntersection: ["$tags", currentManga.tags] } },
          
          // 2. Author Bonus
          authorScore: { $cond: [{ $eq: ["$author", currentManga.author] }, 5, 0] },
          
          // 3. Description Similarity (Calculated by MongoDB Text Index)
          descriptionScore: { $meta: "textScore" },
          
          // 4. Premium Boost for ToonLord revenue
          premiumBoost: { $cond: [{ $eq: ["$isPremium", true] }, 2, 0] }
        }
      },
      {
        $addFields: {
          // Final Ranking Logic
          totalScore: { 
            $add: [
              "$tagScore", 
              "$authorScore", 
              "$premiumBoost", 
              { $multiply: ["$descriptionScore", 2] } // Give double weight to plot similarity
            ] 
          }
        }
      },
      { $sort: { totalScore: -1, rating: -1 } },
      { $limit: 6 }
    ]);

    res.status(200).json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. USER-BASED (For the Homepage "Recommended for You")
// Uses the user's subscription history to suggest new tags
export const getPersonalizedForYou = async (req, res) => {
  try {
    const { userId, isAdultMode } = req.query; // Send from frontend based on user toggle

    // Find manga user is already subscribed to
    const subscribedManga = await Manga.find({ subscribers: userId });
    
    // Extract unique tags user likes
    const favoriteTags = [...new Set(subscribedManga.flatMap(m => m.tags))];

    const recommendations = await Manga.find({
      subscribers: { $ne: userId }, // Don't suggest what they already follow
      isAdult: isAdultMode === 'true',
      tags: { $in: favoriteTags }
    })
    .sort({ views: -1, rating: -1 })
    .limit(10);

    res.status(200).json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};