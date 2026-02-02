import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    // Polymorphic link to either Manga (Novel) or Chapter
    onModelId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        refPath: 'onModel' 
    },
    onModel: {
        type: String,
        required: true,
        enum: ['manga', 'chapter'] // 'Manga' acts as your 'Novel'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    // Voting system
   likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Threading logic
    isReply: { 
        type: Boolean, 
        default: false 
    },
    replies: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment' 
    }],
    // pin commment
    isPinned: { type: Boolean, default: false },
    // Moderation
    isReported: { type: Boolean, default: false }
}, { 
    timestamps: true 
});

// Indexing for speed: find comments for a specific manga/chapter quickly
commentSchema.index({ onModelId: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;