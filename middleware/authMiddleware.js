// middleware/authMiddleware.js
import jwt from "jsonwebtoken";

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // THIS IS CRITICAL: req.user.id must match what you use in getMe
      req.user = { id: decoded.id }; 
      next();
    } catch (error) {
      res.status(401).json({ success: false, message: "Not authorized" });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: "No token found" });
  }
};

export default protect;