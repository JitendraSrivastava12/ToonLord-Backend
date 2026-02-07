// utils/notificationHelper.js
import User from "../models/User.js";

export const addNotification = async (userId, notificationData) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        activityLog: {
          $each: [{
            ...notificationData,
            timestamp: new Date(),
            isRead: false
          }],
          $position: 0 // This puts the newest notification at the top
        }
      }
    });
  } catch (error) {
    console.error("Notification Error:", error);
  }
};