import Comment from "../model/Comment.js";

/* ---------------- POST A COMMENT (Top Level) ---------------- */
export const postComment = async (req, res) => {
    try {
        const { targetId, targetType, content } = req.body; // targetType: 'Manga' or 'Chapter'

        if (!content || !targetId || !targetType) {
            return res.status(400).json({ message: "Content, Target ID, and Type are required" });
        }

        const comment = await Comment.create({
            onModelId: targetId,
            onModel: targetType,
            userId: req.user.id,
            content
        });

        // Await population to send back the user details (name/avatar)
        const populatedComment = await comment.populate("userId", "username profilePicture");

        res.status(201).json(populatedComment);
    } catch (error) {
        console.error("Post Comment Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ---------------- POST A REPLY ---------------- */
export const postReply = async (req, res) => {
    try {
        const { id } = req.params; // Parent Comment ID
        const { content, targetId, targetType } = req.body;

        if (!content || !targetId || !targetType) {
            return res.status(400).json({ message: "Content and Target info required to reply." });
        }

        // 1. Create the reply document
        const reply = await Comment.create({
            onModelId: targetId,
            onModel: targetType,
            userId: req.user.id,
            content,
            isReply: true 
        });

        // 2. Push reply ID into the parent's replies array
        const parentComment = await Comment.findByIdAndUpdate(
            id, 
            { $push: { replies: reply._id } },
            { new: true }
        );

        // Safety: If parent was deleted mid-request, remove the orphaned reply
        if (!parentComment) {
            await Comment.findByIdAndDelete(reply._id);
            return res.status(404).json({ message: "The comment you are replying to no longer exists." });
        }

        const populatedReply = await reply.populate("userId", "username profilePicture");

        res.status(201).json(populatedReply);
    } catch (error) {
        console.error("Reply Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ---------------- GET COMMENTS (Manga or Chapter) ---------------- */
export const getComments = async (req, res) => {
    try {
        const { targetId } = req.params;
        const { type } = req.query; // 'manga' or 'chapter'

        // 1. Fetch all comments for this specific target
        const rawComments = await Comment.find({ 
            onModelId: targetId, 
            onModel: type.toLowerCase() 
        })
        .populate('userId', 'username profilePicture')
        .sort({ createdAt: -1 });

        // 2. Map through and add 'parentId' so buildTree() works
        const formattedComments = rawComments.map(comment => {
            const commentObj = comment.toObject();
            
            // Find if this comment's ID exists in any other comment's 'replies' array
            const parent = rawComments.find(p => 
                p.replies.some(replyId => replyId.toString() === comment._id.toString())
            );

            if (parent) {
                commentObj.parentId = parent._id;
            }

            return commentObj;
        });

        res.status(200).json(formattedComments);
    } catch (error) {
        res.status(500).json({ message: "FETCH_ERROR: Terminal link failed." });
    }
};
/* ---------------- VOTE (Like/Dislike) ---------------- */
export const voteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body; // 'like' or 'dislike'
        const userId = req.user.id;

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ message: "Node not found" });

        // Remove user from both arrays first to prevent duplicates/conflicts
        comment.likes = comment.likes.filter(uid => uid.toString() !== userId);
        comment.dislikes = comment.dislikes.filter(uid => uid.toString() !== userId);

        // Add to the chosen array
        if (voteType === 'like') {
            comment.likes.push(userId);
        } else if (voteType === 'dislike') {
            comment.dislikes.push(userId);
        }

        await comment.save();
        res.status(200).json(comment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ---------------- DELETE ---------------- */
export const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Ensure only the owner can delete
        if (comment.userId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Cleanup: If it's a parent, delete all replies in its array
        if (comment.replies && comment.replies.length > 0) {
            await Comment.deleteMany({ _id: { $in: comment.replies } });
        }

        await comment.deleteOne();
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};