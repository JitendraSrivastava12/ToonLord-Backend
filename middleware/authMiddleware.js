import jwt from "jsonwebtoken";


const protect = async (req, res, next) => {
  let token;

  // Check both capital A and lowercase a
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    try {
      token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user ID to request
      req.user = { id: decoded.id }; 
      return next(); 
    } catch (error) {
      return res.status(401).json({ success: false, message: "Token invalid or expired" });
    }
  }

  // If we reach here, the header was missing or didn't start with Bearer
  return res.status(401).json({ success: false, message: "No token found" });
};

export default protect;

 