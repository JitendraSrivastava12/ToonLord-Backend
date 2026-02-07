import jwt from "jsonwebtoken";
import User from "../model/User.js"; // <--- THIS WAS MISSING

export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user and attach to request
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      console.warn("Invalid token provided, continuing as guest.");
      // Ensure req.user is null if token is bad
      req.user = null; 
    }
  }
  next();
};