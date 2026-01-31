import express from "express";
import { signup, login, updateProfile, getMe, getMyMangas } from "../controller/User.js";
import protect from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/getMe", protect, getMe);
router.get("/my-mangas", protect, getMyMangas);
router.patch("/update-profile", protect, upload.single("profilePicture"), updateProfile);



export default router;
