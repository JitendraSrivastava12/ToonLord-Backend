import jwt from "jsonwebtoken";
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
    }
  }
  // Crucial: ALWAYS call next(), even if no token/user is found
  next();
};