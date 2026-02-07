import User from "../model/User.js";
import mongoose from "mongoose";

export const logActivity = async (userId, data) => {
    try {
        if (!userId) {
            console.error("❌ logActivity: No userId provided.");
            return false;
        }

        // --- THE FIX: Convert String IDs to Mongo ObjectIDs ---
        const mangaId = data.mangaId && mongoose.Types.ObjectId.isValid(data.mangaId) 
            ? new mongoose.Types.ObjectId(data.mangaId) 
            : null;
            
        const chapterId = data.chapterId && mongoose.Types.ObjectId.isValid(data.chapterId) 
            ? new mongoose.Types.ObjectId(data.chapterId) 
            : null;

        const activityEntry = {
            category: data.category,
            type: data.type,
            description: data.description,
            mangaId: mangaId,
            chapterId: chapterId,
            isRead: false,
            contentSnippet: data.contentSnippet || "",
            timestamp: new Date()
        };

        // --- THE UPDATE ---
        const result = await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    activityLog: {
                        $each: [activityEntry],
                        $position: 0,
                        $slice: 50
                    }
                }
            },
            { new: true }
        );

        if (!result) {
            console.error(`❌ DB Fail: User with ID ${userId} not found.`);
            return false;
        }

        console.log(`✅ Activity Logged for ${result.username}: ${data.type}`);
        return true;

    } catch (error) {
        console.error("❌ CRITICAL_LOG_ERROR:", error.message);
        return false;
    }
};