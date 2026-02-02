import express from 'express';
import { 
    postComment, 
    postReply, 
    getComments, 
    voteComment, 
    deleteComment 
} from '../controller/comment.js';
import protect from '../middleware/authMiddleware.js'; // Ensure this path is correct

const router = express.Router();

// --- Public Routes ---
// Fetch comments for a Manga or Chapter
// Example: GET /api/comments/12345?type=Manga
router.get('/:targetId', getComments);

// --- Private Routes (Require Login) ---

// Post a new top-level comment
router.post('/', protect, postComment);

// Post a reply to an existing comment
// Example: POST /api/comments/reply/parentCommentId
router.post('/reply/:id', protect, postReply);

// Vote (Like/Dislike) on a comment
router.patch('/vote/:id', protect, voteComment);

// Delete a comment
router.delete('/:id', protect, deleteComment);

export default router;