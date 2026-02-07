import User from '../model/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide both email and password." });
    }

    // 2. Find the user by email
    const user = await User.findOne({ email });

    // 3. STRICT CHECK: User must exist AND have the 'admin' role
    // We don't tell the user which one failed for security reasons
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: "Invalid administrative credentials." });
    }

    // 4. Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid administrative credentials." });
    }

    // 5. Check if Admin account is active (Safety check)
    if (user.status !== 'active') {
      return res.status(403).json({ message: "This administrative account has been deactivated." });
    }

    // 6. Generate Admin JWT
    // We include 'role' in the payload so the frontend and middleware can verify it easily
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        username: user.username 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '12h' } // Shorter expiry for admin sessions for better security
    );

    // 7. Send Response
    res.status(200).json({
      success: true,
      message: "Terminal connection established.",
      token: token, // Send as raw string, frontend will add 'Bearer '
      admin: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Internal Server Error during authentication." });
  }
};
export default adminLogin;