import User from "../model/User.js";

/* ---------------- GET ACTIVITY LOG ---------------- */
export const getActivity = async (req, res) => {
    try {
        // Fetch only the activityLog array for the user
        const user = await User.findById(req.user.id).select("activityLog");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Return the array directly so the frontend can .map() it easily
        res.status(200).json(user.activityLog || []);
    } catch (error) {
        // Fixed the syntax error in your catch block
        res.status(500).json({ success: false, message: "Activity Not Found" });
    }
};

/* ---------------- MARK ALL AS READ ---------------- */
// Use this when the user opens their notification panel or dashboard
export const markAsRead = async (req, res) => {
    try {
        await User.updateOne(
            { _id: req.user.id },
            { $set: { "activityLog.$[].isRead": true } }
        );

        res.status(200).json({ success: true, message: "Activities marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* ---------------- DELETE LOG HISTORY ---------------- */
// Optional: If you want to let users clear their history
export const clearActivity = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            $set: { activityLog: [] }
        });
        res.status(200).json({ success: true, message: "History cleared" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};