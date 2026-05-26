// backend/testUser.js
require("dotenv").config();
const { db } = require("./config/firebase");
const bcrypt = require("bcryptjs");

async function createTestUser() {
  try {
    console.log("Creating test user...");
    
    const email = "test@example.com";
    const password = "test123";
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = {
      name: "Test User",
      email: email,
      password: hashedPassword,
      isRegistered: true,
      role: "member",
      createdAt: new Date(),
      lastLogin: null,
      teams: []
    };
    
    const usersRef = db.collection("users");
    const existing = await usersRef.where("email", "==", email).get();
    
    if (!existing.empty) {
      await existing.docs[0].ref.update(userData);
      console.log("✅ Updated existing user");
    } else {
      await usersRef.add(userData);
      console.log("✅ Created new user");
    }
    
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    // Verify the user was created
    const verify = await usersRef.where("email", "==", email).get();
    if (!verify.empty) {
      const user = verify.docs[0].data();
      console.log("Verification - User exists:", !!user);
      console.log("Verification - Has password:", !!user.password);
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

createTestUser();