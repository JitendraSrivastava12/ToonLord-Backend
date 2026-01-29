import jwt from "jsonwebtoken";

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id }; 
      return next(); // Use 'return' to stop execution here
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
  }

  // If we get here, no token was found
  return res.status(401).json({ success: false, message: "No token found" });
};

export default protect;