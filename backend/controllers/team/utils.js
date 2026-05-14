// backend/controllers/team/utils.js
const crypto = require('crypto');
const db = require("../../config/firebase");

// Generate unique invite token
const generateInviteToken = () => crypto.randomBytes(32).toString('hex');

// Verify admin access to team
const verifyAdminAccess = async (adminId, teamId) => {
  const adminDoc = await db.collection("admins").doc(adminId).get();
  if (!adminDoc.exists) return false;
  const adminTeams = adminDoc.data().teams || [];
  return adminTeams.includes(teamId);
};

// Get admin details
const getAdminDetails = async (adminId) => {
  const adminDoc = await db.collection("admins").doc(adminId).get();
  if (!adminDoc.exists) return null;
  return adminDoc.data();
};

// Get team document
const getTeam = async (teamId) => {
  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) return null;
  return { id: teamDoc.id, ...teamDoc.data() };
};

// Update team document
const updateTeam = async (teamId, data) => {
  await db.collection("teams").doc(teamId).update(data);
};

// Check if user exists
const getUserByEmail = async (email) => {
  const userQuery = await db.collection("users").where("email", "==", email).get();
  if (userQuery.empty) return null;
  return { id: userQuery.docs[0].id, ...userQuery.docs[0].data() };
};

// Create new user
const createUser = async (email, name, password) => {
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUserRef = db.collection("users").doc();
  const userId = newUserRef.id;
  
  await newUserRef.set({
    email,
    name: name || email.split('@')[0],
    password: hashedPassword,
    isRegistered: true,
    createdAt: new Date(),
    lastLogin: new Date(),
    teams: []
  });
  
  return userId;
};

module.exports = {
  generateInviteToken,
  verifyAdminAccess,
  getAdminDetails,
  getTeam,
  updateTeam,
  getUserByEmail,
  createUser,
  db
};