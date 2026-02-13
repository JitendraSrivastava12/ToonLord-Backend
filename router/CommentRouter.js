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
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. SPECIFIC routes first
router.get('/me', protect, getMyOwnComments); 
router.get('/creator', protect, getCreatorComments);

// 2. DYNAMIC/PARAMETER routes last
router.get('/:targetId', getComments);

// --- Private Routes ---
router.post('/', protect, postComment);
router.post('/reply/:id', protect, postReply);
router.patch('/vote/:id', protect, voteComment);
router.delete('/:id', protect, deleteComment);

export default router;