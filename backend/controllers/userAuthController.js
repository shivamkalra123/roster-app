// backend/controllers/userAuthController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");

class UserAuthController {
  
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log("🔐 Login attempt:", email);

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

      const token = jwt.sign(
        {
          userId: userId,
          email: user.email,
          name: user.name,
          role: "member"
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      console.log("✅ Login successful for user:", userId);

      res.json({
        success: true,
        token: token,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          role: "member"
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  static async register(req, res) {
    try {
      const { email, password, name, inviteToken } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const usersRef = db.collection("users");
      const existingUser = await usersRef.where("email", "==", email).get();

      const hashedPassword = await bcrypt.hash(password, 10);

      if (!existingUser.empty) {
        const userDoc = existingUser.docs[0];
        await userDoc.ref.update({
          name: name,
          password: hashedPassword,
          isRegistered: true,
          updatedAt: new Date()
        });
      } else {
        await usersRef.add({
          name: name,
          email: email,
          password: hashedPassword,
          isRegistered: true,
          role: "member",
          createdAt: new Date()
        });
      }

      const token = jwt.sign(
        { email: email, name: name, role: "member" },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.status(201).json({
        success: true,
        token: token,
        user: { name: name, email: email, role: "member" }
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UserAuthController;