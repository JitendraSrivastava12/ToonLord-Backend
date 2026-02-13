import Comment from "../model/Comment.js";
import User from "../model/User.js";
import Manga from "../model/Manga.js";
import Chapter from "../model/Chapter.js";
import { logActivity } from "../services/activity.service.js";

/* ---------------- POST A COMMENT (Top Level) ---------------- */
export const postComment = async (req, res) => {
  try {
    const { targetId, targetType, content } = req.body;

    if (!content || !targetId || !targetType) {
      return res.status(400).json({ message: "Content, Target ID, and Type are required" });
    }

    const comment = await Comment.create({
      onModelId: targetId,
      onModel: targetType,
      userId: req.user.id,
      content,
    });

    const sender = await User.findById(req.user.id);
    const populatedComment = await comment.populate("userId", "username profilePicture");

    // --- REMOVED READER ACTIVITY (Self-log) ---

    // 2. NOTIFICATION: Find creator to notify them
    let targetCreator;
    let mangaTitleForNotif = "";

    if (targetType === "manga") {
      targetCreator = await User.findOne({ createdSeries: targetId });
      const m = await Manga.findById(targetId);
      mangaTitleForNotif = m?.title || "your series";
    } else {
      const ch = await Chapter.findById(targetId);
      const mang = await Manga.findById(ch.mangaId);
      mangaTitleForNotif = mang?.title || "your series";
      targetCreator = await User.findOne({ createdSeries: mang._id });
    }

    if (targetCreator && targetCreator._id.toString() !== req.user.id) {
      await logActivity(targetCreator._id, {
        category: "notification", // Changed from creator to notification
        type: "received_comment",
        description: `${sender.username} commented on ${mangaTitleForNotif}`,
        contentSnippet: content.substring(0, 50),
        mangaId: targetType === "manga" ? targetId : undefined,
        originator: {
          userId: sender._id,
          username: sender.username,
          avatar: sender.profilePicture,
        },
        isRead: false,
        timestamp: new Date(),
      });
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- POST A REPLY ---------------- */
export const postReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, targetId, targetType } = req.body;
    const sender = await User.findById(req.user.id);

    const reply = await Comment.create({
      onModelId: targetId,
      onModel: targetType,
      userId: req.user.id,
      content,
      isReply: true,
    });

    const parentComment = await Comment.findByIdAndUpdate(
      id,
      { $push: { replies: reply._id } },
      { new: true },
    ).populate("userId", "username profilePicture");

    if (!parentComment) {
      await Comment.findByIdAndDelete(reply._id);
      return res.status(404).json({ message: "Parent comment not found." });
    }

    // 1. NOTIFICATION to the parent comment author
    if (parentComment.userId._id.toString() !== req.user.id) {
      await logActivity(parentComment.userId._id, {
        category: "notification", // Changed from reader to notification
        type: "received_reply",
        description: `${sender.username} replied to your comment`,
        contentSnippet: content.substring(0, 50),
        originator: {
          userId: sender._id,
          username: sender.username,
          avatar: sender.profilePicture,
        },
        isRead: false,
        timestamp: new Date(),
      });
    }

    res.status(201).json(await reply.populate("userId", "username profilePicture"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- VOTE (Like/Dislike) ---------------- */
export const voteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { voteType } = req.body;
    const userId = req.user.id;
    const sender = await User.findById(userId);

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.likes = comment.likes.filter((uid) => uid.toString() !== userId);
    comment.dislikes = comment.dislikes.filter((uid) => uid.toString() !== userId);

    if (voteType === "like") {
      // NOTE: This check ensures we only add and notify if it wasn't filtered out
      comment.likes.push(userId);

      // NOTIFICATION: Notify the author of the comment
      if (comment.userId.toString() !== userId) {
        await logActivity(comment.userId, {
          category: "notification", // Changed from reader to notification
          type: "received_like",
          description: `${sender.username} liked your comment`,
          originator: {
            userId: sender._id,
            username: sender.username,
            avatar: sender.profilePicture,
          },
          isRead: false,
          timestamp: new Date(),
        });
      }
    }

    await comment.save();
    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET COMMENTS (Manga or Chapter) ---------------- */
export const getComments = async (req, res) => {
  try {
    const { targetId } = req.params;
    const { type } = req.query;

    const rawComments = await Comment.find({
      onModelId: targetId,
      onModel: type.toLowerCase(),
    })
      .populate("userId", "username profilePicture")
      .sort({ createdAt: -1 });

    const formattedComments = rawComments.map((comment) => {
      const commentObj = comment.toObject();
      const parent = rawComments.find((p) =>
        p.replies.some((replyId) => replyId.toString() === comment._id.toString())
      );
      if (parent) commentObj.parentId = parent._id;
      return commentObj;
    });

    res.status(200).json(formattedComments);
  } catch (error) {
    res.status(500).json({ message: "FETCH_ERROR: Connection failed." });
  }
};

/* ---------------- DELETE ---------------- */
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (comment.replies && comment.replies.length > 0) {
      await Comment.deleteMany({ _id: { $in: comment.replies } });
    }

    await comment.deleteOne();
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ---------------- GET CREATOR COMMENTS ---------------- */
export const getCreatorComments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("createdSeries");
    if (!user || !user.createdSeries || user.createdSeries.length === 0) {
      return res.status(200).json([]);
    }

    const myMangaIds = user.createdSeries;
    const myChapters = await Chapter.find({ mangaId: { $in: myMangaIds } }).select("_id");
    const myChapterIds = myChapters.map((ch) => ch._id);
    const ownedContentIds = [...myMangaIds, ...myChapterIds];

    const comments = await Comment.find({ onModelId: { $in: ownedContentIds } })
      .populate("userId", "username profilePicture")
      .sort({ createdAt: -1 })
      .lean();

    const processedComments = await Promise.all(
      comments.map(async (comment) => {
        let contextData = { title: "Unknown Content" };
        if (comment.onModel === "manga") {
          const m = await Manga.findById(comment.onModelId).select("title").lean();
          if (m) contextData.title = m.title;
        } else if (comment.onModel === "chapter") {
          const c = await Chapter.findById(comment.onModelId).select("chapterNumber mangaId").lean();
          if (c) {
            const parentManga = await Manga.findById(c.mangaId).select("title").lean();
            contextData.title = parentManga ? parentManga.title : "Unknown Series";
            contextData.chapterNumber = c.chapterNumber;
          }
        }
        comment.onModelId = contextData;
        return comment;
      })
    );

    return res.status(200).json(processedComments);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
export const getMyOwnComments = async (req, res) => {
  try {
    // Find comments made by the logged-in user
    const comments = await Comment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance since we will manual-populate

    // Since onModelId is polymorphic, we map through to get context titles
    const populatedComments = await Promise.all(
      comments.map(async (comment) => {
        let contextData = { title: "Deleted Content" };
        
        if (comment.onModel === "manga") {
          const m = await Manga.findById(comment.onModelId).select("title coverImage").lean();
          if (m) contextData = { title: m.title, image: m.coverImage };
        } else if (comment.onModel === "chapter") {
          const ch = await Chapter.findById(comment.onModelId).select("chapterNumber mangaId").lean();
          if (ch) {
            const m = await Manga.findById(ch.mangaId).select("title coverImage").lean();
            contextData = { 
              title: m ? m.title : "Unknown Manga", 
              chapterNumber: ch.chapterNumber,
              image: m?.coverImage 
            };
          }
        }
        
        return { ...comment, context: contextData };
      })
    );

    res.status(200).json(populatedComments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching your comments", error: error.message });
  }
};