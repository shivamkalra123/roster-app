// backend/controllers/team/acceptInvite.js
const jwt = require("jsonwebtoken");
const emailService = require("../../services/emailService");
const { getTeam, updateTeam, db } = require("./utils");
const bcrypt = require("bcryptjs");

module.exports = async (req, res) => {
  try {
    const { token: inviteToken, teamId, name, password } = req.body;

    console.log("=== ACCEPT INVITE DEBUG ===");
    console.log("Team ID:", teamId);
    console.log("Token:", inviteToken);

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Get team
    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Find user by inviteToken
    const usersRef = db.collection("users");
    const userSnapshot = await usersRef.where("inviteToken", "==", inviteToken).get();
    
    let userId = null;
    let userData = null;
    let userEmail = null;
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      userId = userDoc.id;
      userData = userDoc.data();
      userEmail = userData.email;
      console.log("✅ Found user by inviteToken:", userId);
    } else {
      // Try to find by email from pending invite
      const pendingInvite = team.pendingInvites?.find(inv => inv.token === inviteToken);
      if (pendingInvite) {
        userEmail = pendingInvite.email;
        const userByEmail = await usersRef.where("email", "==", userEmail).get();
        if (!userByEmail.empty) {
          userId = userByEmail.docs[0].id;
          userData = userByEmail.docs[0].data();
          console.log("✅ Found user by email:", userId);
        }
      }
    }
    
    if (!userId) {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUserRef = db.collection("users").doc();
      userId = newUserRef.id;
      userEmail = userEmail || (team.pendingInvites?.find(inv => inv.token === inviteToken)?.email);
      
      await newUserRef.set({
        email: userEmail,
        name: name,
        password: hashedPassword,
        isRegistered: true,
        role: "member",
        createdAt: new Date(),
        lastLogin: new Date(),
        teams: []  // Will add team below
      });
      console.log("✅ Created new user:", userId);
    } else {
      // Update existing user with password
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.collection("users").doc(userId).update({
        password: hashedPassword,
        name: name || userData.name,
        isRegistered: true,
        updatedAt: new Date()
      });
      console.log("✅ Updated existing user with password:", userId);
    }
    
    // ========== IMPORTANT: ADD TEAM TO USER'S TEAMS ARRAY ==========
    const userDoc = await db.collection("users").doc(userId).get();
    const currentTeams = userDoc.data().teams || [];
    const alreadyHasTeam = currentTeams.some(t => t.teamId === teamId);
    
    if (!alreadyHasTeam) {
      await db.collection("users").doc(userId).update({
        teams: [...currentTeams, {
          teamId: teamId,
          teamName: team.name,
          role: "member",
          joinedAt: new Date()
        }]
      });
      console.log(`✅ Added team ${team.name} to user's teams array`);
    }
    
    // Remove invite from team's pendingInvites
    if (team.pendingInvites) {
      const updatedInvites = team.pendingInvites.filter(inv => inv.token !== inviteToken);
      await updateTeam(teamId, { pendingInvites: updatedInvites });
      console.log("✅ Removed invite from pendingInvites");
    }
    
    // Add to team members if not already
    const existingMember = team.members?.find(m => m.userId === userId);
    if (!existingMember) {
      const newMember = {
        userId: userId,
        email: userEmail,
        name: name,
        role: "member",
        addedAt: new Date(),
        addedBy: "invite",
        isRegistered: true,
        memberData: {
          baseGroup: null,
          shiftCounts: {},
          preferences: { preferred: [], avoid: [] },
          leaves: []
        }
      };
      
      const updatedMembers = [...(team.members || []), newMember];
      await updateTeam(teamId, { members: updatedMembers });
      console.log("✅ Added user to team members");
    }
    
    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
    const authToken = jwt.sign(
      {
        userId: userId,
        email: userEmail,
        role: "member",
        teamId: teamId,
        name: name
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    
    console.log("✅ User successfully joined team with password and team mapping!");
    
    res.json({
      success: true,
      token: authToken,
      user: {
        id: userId,
        name: name,
        email: userEmail,
        teamId: teamId,
        teamName: team.name
      }
    });
    
  } catch (error) {
    console.error("Accept Invite Error:", error);
    res.status(500).json({ error: error.message });
  }
};