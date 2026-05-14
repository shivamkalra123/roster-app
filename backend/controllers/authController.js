// controllers/authController.js
const { db } = require("../config/firebase");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "your_secret_key"; // move to .env later

class AuthController {
  
  // ================= MEMBER LOGIN =================
  static async memberLogin(req, res) {
    try {
      const { email, password } = req.body;

      const teamsSnap = await db.collection("teams").get();

      let foundUser = null;
      let teamId = null;

      // 🔥 search across teams
      for (const teamDoc of teamsSnap.docs) {
        const usersSnap = await db
          .collection("teams")
          .doc(teamDoc.id)
          .collection("users")
          .where("email", "==", email)
          .get();

        if (!usersSnap.empty) {
          foundUser = usersSnap.docs[0];
          teamId = teamDoc.id;
          break;
        }
      }

      if (!foundUser) {
        return res.status(401).json({ error: "User not found" });
      }

      const user = foundUser.data();

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          userId: foundUser.id,
          role: "member",
          teamId
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        token,
        user: {
          id: foundUser.id,
          name: user.name,
          teamId
        }
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // ================= ADMIN LOGIN =================
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password required"
        });
      }

      // 🔹 Find admin by email
      const snap = await db
        .collection("admins")
        .where("email", "==", email)
        .get();

      if (snap.empty) {
        return res.status(401).json({
          error: "Invalid credentials"
        });
      }

      const adminDoc = snap.docs[0];
      const admin = adminDoc.data();

      // 🔹 Compare password
      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res.status(401).json({
          error: "Invalid credentials"
        });
      }

      // 🔹 Generate token
      const token = jwt.sign(
        {
          adminId: adminDoc.id,
          email: admin.email,
          role: "admin"
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        token,
        admin: {
          id: adminDoc.id,
          email: admin.email
        }
      });

    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ================= VERIFY TOKEN =================
  static async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          error: "No token provided" 
        });
      }

      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if it's an admin token
      if (decoded.role === 'admin' || decoded.adminId) {
        const adminDoc = await db.collection("admins").doc(decoded.adminId).get();
        
        if (!adminDoc.exists) {
          return res.status(401).json({ 
            success: false, 
            error: "Admin not found" 
          });
        }

        return res.json({
          success: true,
          admin: {
            id: adminDoc.id,
            email: adminDoc.data().email
          }
        });
      }
      
      // Check if it's a member token
      if (decoded.role === 'member' || decoded.userId) {
        // Find user across teams
        const teamsSnap = await db.collection("teams").get();
        
        for (const teamDoc of teamsSnap.docs) {
          const userDoc = await db
            .collection("teams")
            .doc(teamDoc.id)
            .collection("users")
            .doc(decoded.userId)
            .get();
            
          if (userDoc.exists) {
            return res.json({
              success: true,
              user: {
                id: userDoc.id,
                name: userDoc.data().name,
                teamId: teamDoc.id
              }
            });
          }
        }
      }
      
      return res.status(401).json({ 
        success: false, 
        error: "Invalid token" 
      });

    } catch (error) {
      console.error("Verify Token Error:", error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid token" 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: "Token expired" 
        });
      }
      
      res.status(401).json({ 
        success: false, 
        error: "Authentication failed" 
      });
    }
  }
}

module.exports = AuthController;