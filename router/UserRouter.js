import express from "express";
import { signup, login ,updateProfile,getMe} from "../controller/User.js";
import protect  from "../middleware/authMiddleware.js";
import {upload} from "../middleware/fileMiddleware.js";
const router = express.Router();

// PUBLIC ROUTES (No token needed)
router.post("/signup", signup); 
router.post("/login", login);
router.get("/getMe", protect,getMe);
router.patch("/update-profile", protect, upload.single("profilePicture"), updateProfile);

// PROTECTED ROUTES (Token required)
// router.get("/me", protect, getMe); 

export default router;