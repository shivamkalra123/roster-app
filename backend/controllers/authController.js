// backend/controllers/authController.js
const { db } = require("../config/firebase");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

class AuthController {
  
  // ================= MEMBER LOGIN =================
  static async memberLogin(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const usersRef = db.collection("users");
      const snapshot = await usersRef.where("email", "==", email).get();

      if (snapshot.empty) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const userDoc = snapshot.docs[0];
      const user = userDoc.data();
      const userId = userDoc.id;

      if (!user.password) {
        return res.status(401).json({ 
          error: "Account not activated. Please check your invitation email." 
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const userTeams = user.teams || [];
      let primaryTeamId = null;
      let primaryTeamName = null;

      for (const team of userTeams) {
        if (!primaryTeamId) {
          primaryTeamId = team.teamId;
          primaryTeamName = team.teamName;
        }
      }

      await db.collection("users").doc(userId).update({
        lastLogin: new Date()
      });

      const token = jwt.sign(
        {
          userId: userId,
          email: user.email,
          name: user.name,
          role: "member",
          teamId: primaryTeamId
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({
        success: true,
        token: token,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          teamId: primaryTeamId,
          teamName: primaryTeamName,
          role: "member"
        }
      });
    } catch (error) {
      console.error("Member login error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ================= ADMIN LOGIN =================
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const snap = await db.collection("admins").where("email", "==", email).get();

      if (snap.empty) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const adminDoc = snap.docs[0];
      const admin = adminDoc.data();

      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

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
          email: admin.email,
          name: admin.name
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

      const decoded = jwt.verify(token, JWT_SECRET);
      
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
            email: adminDoc.data().email,
            name: adminDoc.data().name
          }
        });
      }
      
      if (decoded.role === 'member' || decoded.userId) {
        const userDoc = await db.collection("users").doc(decoded.userId).get();
          
        if (userDoc.exists) {
          return res.json({
            success: true,
            user: {
              id: userDoc.id,
              name: userDoc.data().name,
              email: userDoc.data().email,
              teamId: decoded.teamId
            }
          });
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