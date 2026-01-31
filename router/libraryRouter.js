import express from "express";
import { signup, login, updateProfile, getMe, getMyMangas } from "../controller/User.js";
import protect from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import { updateLibraryItem } from "../controller/library.js";

const router = express.Router();
router.post("/update", protect, updateLibraryItem);
export default router;