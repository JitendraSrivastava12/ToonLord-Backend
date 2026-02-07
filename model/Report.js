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
  reason: { 
    type: String, 
    required: true,
    enum: ["Spam", "Toxic Behavior", "Copyright Violation", "Inappropriate Content", "Other"]
  },
  details: { type: String },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }, // ID of the specific Manga or Comment being reported
  targetType: { 
    type: String, 
    enum: ["manga", "comment", "chapter"], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["pending", "resolved", "dismissed"], 
    default: "pending" 
  }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);