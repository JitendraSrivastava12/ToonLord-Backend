import User from "../model/User.js";
import express from "express";
import { signup, login, updateProfile, getMe, getMyMangas, updateMyManga,requestAuthor,getAllUsers,manageUserStatus,deleteUser } from "../controller/User.js";
import { getActivity } from "../controller/activity.controller.js";
import protect from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
const router = express.Router();
router.get("/activity",protect,getActivity);
router.post("/signup", signup);
router.post("/login", login);
router.get("/getMe", protect, getMe);
router.post("/request-author", protect, requestAuthor);
router.get("/my-mangas", protect, getMyMangas);
router.patch("/update-profile", protect, upload.single("profilePicture"), updateProfile);
router.put("/my-mangas/update/:mangaId",protect,upload.single('coverImage'),updateMyManga);
  router.get("/all", protect, getAllUsers);
router.patch("/manage-status", protect, manageUserStatus);
router.delete("/delete/:userId", protect, deleteUser);
router.get("/notifications", protect,async (req, res) => {
  const user = await User.findById(req.user.id).select("activityLog");
  res.json(user.activityLog);
});

// PATCH: Mark all as read
router.patch("/notifications/read",protect, async (req, res) => {
  await User.updateOne(
    { _id: req.user.id, "activityLog.isRead": false },
    { $set: { "activityLog.$[].isRead": true } }
  );
  res.json({ message: "All marked as read" });
});



export default router;