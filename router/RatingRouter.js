import express from "express";
// Ensure this path matches your folder name (controller vs controllers)
import { rateManga, getUserMangaRating } from "../controller/RatingController.js"; 
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// POST: http://localhost:5000/api/ratings/rate
// Purpose: Allows a logged-in user to submit or update a rating
router.post("/rate", protect, rateManga);

// GET: http://localhost:5000/api/ratings/:mangaId
// Purpose: Fetches the specific rating given by the logged-in user for a manga
router.get("/:mangaId", protect, getUserMangaRating);

// This line fixes your "does not provide an export named default" error
export default router;