import User from "../model/User.js";

const admin = async (req, res, next) => {
  try {
    // 1. Check if req.user exists (attached by your auth/protect middleware)
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, no user found" });
    }
    console.log(req.user)

    // 2. Fetch the latest user data from DB to ensure role is current
    const user = await User.findById(req.user.id);
    console.log(user);

    // 3. Strict Role Check
    if (user && user.role === 'admin') {
      console.log(`Access Granted: Admin ${user.username}`);
      next(); // Move to the controller
    } else {
      console.log(`Access Denied: ${user?.username} is a ${user?.role}`);
      res.status(403).json({ message: 'Access denied: Administrative privileges required' });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error in Admin Middleware" });
  }
};

export default admin;