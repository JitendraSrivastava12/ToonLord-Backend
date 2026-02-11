import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  targetUser: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  // Added Manga reference for easier Admin filtering
  parentManga: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "manga"
  },
  // Expanded Reasons to include Technical issues
  reason: { 
    type: String, 
    required: true,
    enum: [
      "Spam", 
      "Toxic Behavior", 
      "Copyright Violation", 
      "Inappropriate Content", 
      "Broken Images",       // Added for Chapters
      "Wrong Chapter Order", // Added for Chapters
      "Missing Pages",       // Added for Chapters
      "Other"
    ]
  },
  details: { type: String },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }, 
  targetType: { 
    type: String, 
    enum: ["manga", "comment", "chapter"], 
    required: true 
  },
  // Added to track which specific number was reported without deep-joining
  chapterNumber: {
    type: Number
  },
  status: { 
    type: String, 
    enum: ["pending", "resolved", "dismissed","investigating"], 
    default: "pending" 
  },
  // Useful for priority sorting
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium"
  }
}, { timestamps: true });

// Indexing for faster admin dashboard queries
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);