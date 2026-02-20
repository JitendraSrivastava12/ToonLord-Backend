import express from 'express';
import { 
    postComment, 
    postReply, 
    getComments, 
    voteComment, 
    deleteComment,
    getCreatorComments,
    getMyOwnComments
} from '../controller/comment.js';
import Comment from "../model/Comment.js";
import protect from '../middleware/authMiddleware.js';
import { banCheck } from '../middleware/banningMiddleware.js';

const router = express.Router();

// 1. SPECIFIC routes first
router.get('/me', protect, getMyOwnComments); 
router.get('/creator', protect, getCreatorComments);

// 2. DYNAMIC/PARAMETER routes last
router.get('/:targetId', getComments);

// --- Private Routes ---
router.post('/', protect,banCheck, postComment);
router.post('/reply/:id', protect,banCheck, postReply);
router.patch('/vote/:id', protect,banCheck, voteComment);
router.delete('/:id', protect,banCheck, deleteComment);
// GET: Get all comments by a specific user (For Visitor Profile)
// GET: Get all comments by a specific user (Safe Polymorphic Version)
router.get("/user/:userId", async (req, res) => {
    try {
        const comments = await Comment.find({ userId: req.params.userId })
            .populate({
                path: 'onModelId',
                // We select fields that exist in BOTH Manga and Chapter (like title)
                // If one doesn't have coverImage, it just returns null instead of crashing
                select: 'title coverImage chapterNumber', 
            })
            .sort({ createdAt: -1 });

        // Filter out any potential nulls if a referenced Manga/Chapter was deleted
        const validComments = comments.filter(c => c.onModelId !== null);

        res.json(validComments);
    } catch (error) {
        console.error("Comment Fetch Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching user conversations",
            error: error.message 
        });
    }
});

export default router;