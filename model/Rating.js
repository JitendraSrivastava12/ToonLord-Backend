import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  manga: { type: mongoose.Schema.Types.ObjectId, ref: "manga", required: true },
  score: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });

// COMPOUND INDEX: Prevents multiple entries for the same user/manga pair
ratingSchema.index({ user: 1, manga: 1 }, { unique: true });

export default mongoose.model("Rating", ratingSchema);