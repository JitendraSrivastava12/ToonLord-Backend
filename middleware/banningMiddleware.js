import User from "../model/User.js";

/**
 * Middleware to block banned or suspended users.
 * Place this AFTER the protect middleware in your routes.
 */
export const banCheck = async (req, res, next) => {
  try {
    // req.user.id comes from the protect middleware
    const user = await User.findById(req.user.id).select("status");

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found in the grid." 
      });
    }

    // 1. HARD BLOCK: Banned Users
    if (user.status === "banned") {
      return res.status(403).json({ 
        success: false, 
        message: "You are banned from this website." 
      });
    }

    // 2. SOFT BLOCK: Suspended Users (Optional)
    // You can use this for routes like /upload or /comment
    if (user.status === "suspended") {
      // Define which routes suspended users can't access
      const restrictedMethods = ["POST", "PUT", "DELETE", "PATCH"];
      if (restrictedMethods.includes(req.method)) {
        return res.status(403).json({ 
          success: false, 
          message: "Account suspended. Write access restricted." 
        });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Security sync failed." });
  }
};