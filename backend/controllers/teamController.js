// backend/controllers/teamController.js
const db = require("../config/firebase");
const emailService = require("../services/emailService");
const crypto = require("crypto");

class TeamController {

  // ================= CREATE TEAM =================
  static async createTeam(req, res) {
    try {
      const { name, memberEmails = [] } = req.body;
      const adminId = req.admin.adminId;

      if (!name) {
        return res.status(400).json({ error: "Team name required" });
      }

      // Get admin details
      const adminDoc = await db.collection("admins").doc(adminId).get();
      if (!adminDoc.exists) {
        return res.status(404).json({ error: "Admin not found" });
      }
      const adminData = adminDoc.data();
      const adminEmail = adminData.email;

      // Generate teamId (slug)
      const teamId = name.toLowerCase().replace(/\s+/g, "-");

      // Check if team exists
      const existing = await db.collection("teams").doc(teamId).get();
      if (existing.exists) {
        return res.status(400).json({ error: "Team already exists" });
      }

      // Prepare members and pending invites
      const members = [];
      const pendingInvites = [];

      for (const email of memberEmails) {
        // Generate unique invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        
        // Check if user exists in system
        const userQuery = await db.collection("users").where("email", "==", email).get();
        
        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          members.push({
            userId: userDoc.id,
            email: email,
            name: userDoc.data().name || email,
            role: "member",
            addedAt: new Date(),
            addedBy: adminId,
            isRegistered: true,
            memberData: {
              baseGroup: null,
              shiftCounts: {},
              preferences: { preferred: [], avoid: [] },
              leaves: []
            }
          });
          
          // Send welcome email to existing user
          await emailService.sendWelcomeEmail(email, userDoc.data().name || email, name);
        } else {
          // Store pending invite with token
          pendingInvites.push({
            email: email,
            token: inviteToken,
            invitedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          });
          
          // Send email invitation
          await emailService.sendTeamInvitation(
            email, 
            name, 
            adminEmail || "Team Administrator", 
            teamId, 
            inviteToken
          );
        }
      }

      // Create team
      await db.collection("teams").doc(teamId).set({
        name,
        createdBy: adminId,
        createdAt: new Date(),
        members: members,
        pendingInvites: pendingInvites,
        settings: {
          allowMemberInvites: false,
          requireApproval: true
        }
      });

      // Add team to admin
      const adminRef = db.collection("admins").doc(adminId);
      const currentAdminTeams = adminData.teams || [];
      await adminRef.update({
        teams: [...currentAdminTeams, teamId]
      });

      // Add team reference to each registered member's user document
      for (const member of members) {
        const userRef = db.collection("users").doc(member.userId);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
          const currentUserTeams = userDoc.data().teams || [];
          await userRef.update({
            teams: [...currentUserTeams, {
              teamId: teamId,
              teamName: name,
              role: member.role,
              addedAt: new Date(),
              memberData: member.memberData
            }]
          });
        }
      }

      res.json({
        success: true,
        teamId,
        message: "Team created successfully",
        addedMembers: members.length,
        pendingInvites: pendingInvites.length,
        invitesSent: pendingInvites.length
      });

    } catch (error) {
      console.error("Create Team Error:", error);
      res.status(500).json({ error: error.message });
    }
  }



// backend/controllers/teamController.js - Fixed addTeamMember

// ================= ADD TEAM MEMBER =================
static async addTeamMember(req, res) {
  try {
    const { teamId } = req.params;
    const { email, name, baseGroup = null } = req.body;
    const adminId = req.admin.adminId;

    console.log("=== ADD MEMBER DEBUG ===");
    console.log("Team ID:", teamId);
    console.log("Email:", email);
    console.log("Name:", name);

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    // Check if team exists
    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team = teamDoc.data();
    
    // Verify admin has access
    const adminDoc = await db.collection("admins").doc(adminId).get();
    if (!adminDoc.exists) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const adminTeams = adminDoc.data().teams || [];
    if (!adminTeams.includes(teamId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if member already exists in team's members array
    const existingMember = team.members?.find(m => m.email === email);
    if (existingMember) {
      return res.status(400).json({ error: "Member already exists in team" });
    }

    // Check if already invited (pending invites)
    let existingInvite = team.pendingInvites?.find(invite => invite.email === email);
    
    // Generate new invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    // Check if user exists in global users collection
    const userQuery = await db.collection("users").where("email", "==", email).get();
    let userId;
    let userExists = false;

    if (!userQuery.empty) {
      userExists = true;
      userId = userQuery.docs[0].id;
      const userData = userQuery.docs[0].data();
      
      // ALWAYS send a new invitation email when re-adding
      // Update or create pending invite
      if (existingInvite) {
        // Update existing invite with new token
        existingInvite.token = inviteToken;
        existingInvite.invitedAt = new Date();
        existingInvite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else {
        // Create new pending invite
        existingInvite = {
          email: email,
          token: inviteToken,
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
      }
      
      // Send invitation email (always for re-adds)
      const adminEmail = adminDoc.data().email;
      await emailService.sendTeamInvitation(
        email, 
        team.name, 
        adminEmail || "Team Administrator", 
        teamId, 
        inviteToken
      );
      
      // Don't add to team members yet - they need to accept the invitation first
      // Just update or add to pending invites
      let updatedPendingInvites = [...(team.pendingInvites || [])];
      const inviteIndex = updatedPendingInvites.findIndex(invite => invite.email === email);
      
      if (inviteIndex !== -1) {
        updatedPendingInvites[inviteIndex] = existingInvite;
      } else {
        updatedPendingInvites.push(existingInvite);
      }
      
      await db.collection("teams").doc(teamId).update({
        pendingInvites: updatedPendingInvites
      });
      
      // Also remove from members array if somehow still there (cleanup)
      const updatedMembers = (team.members || []).filter(m => m.email !== email);
      if (updatedMembers.length !== (team.members || []).length) {
        await db.collection("teams").doc(teamId).update({
          members: updatedMembers
        });
      }
      
      console.log(`Invitation sent to existing user ${email} for re-joining team`);
      
      return res.json({
        success: true,
        message: "Invitation sent successfully. User needs to accept to re-join the team.",
        member: null,
        isRegistered: userExists,
        inviteSent: true,
        requiresAcceptance: true
      });
      
    } else {
      // User doesn't exist globally - create pending user
      const newUserRef = db.collection("users").doc();
      userId = newUserRef.id;
      await newUserRef.set({
        email,
        name,
        isRegistered: false,
        createdAt: new Date(),
        inviteToken: inviteToken,
        teams: []
      });
      
      // Send email invitation
      const adminEmail = adminDoc.data().email;
      await emailService.sendTeamInvitation(
        email, 
        team.name, 
        adminEmail || "Team Administrator", 
        teamId, 
        inviteToken
      );
      
      // Add to pending invites
      const newPendingInvite = {
        email: email,
        token: inviteToken,
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
      
      const updatedPendingInvites = [...(team.pendingInvites || []), newPendingInvite];
      await db.collection("teams").doc(teamId).update({
        pendingInvites: updatedPendingInvites
      });
      
      console.log(`Invitation sent to new user ${email}`);
      
      return res.json({
        success: true,
        message: "Invitation sent successfully",
        member: null,
        isRegistered: false,
        inviteSent: true,
        requiresAcceptance: true
      });
    }

  } catch (error) {
    console.error("Add Member Error:", error);
    res.status(500).json({ error: error.message });
  }
}
  // ================= GET TEAMS =================
  static async getTeams(req, res) {
    try {
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      if (!adminDoc.exists) {
        return res.status(404).json({ error: "Admin not found" });
      }
      
      const admin = adminDoc.data();
      const teamIds = admin.teams || [];

      const teams = [];
      for (const teamId of teamIds) {
        const teamDoc = await db.collection("teams").doc(teamId).get();
        if (teamDoc.exists) {
          const teamData = teamDoc.data();
          teams.push({
            teamId: teamId,
            name: teamData.name,
            createdAt: teamData.createdAt,
            memberCount: (teamData.members || []).length,
            pendingCount: (teamData.pendingInvites || []).length
          });
        }
      }

      res.json({
        success: true,
        teams: teams
      });

    } catch (error) {
      console.error("Get Teams Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ================= GET TEAM DETAILS =================
  static async getTeam(req, res) {
    try {
      const { teamId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const doc = await db.collection("teams").doc(teamId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const teamData = doc.data();
      
      res.json({
        success: true,
        team: {
          ...teamData,
          teamId: teamId,
          memberCount: (teamData.members || []).length,
          pendingCount: (teamData.pendingInvites || []).length
        }
      });

    } catch (error) {
      console.error("Get Team Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ================= GET TEAM MEMBERS =================
  static async getTeamMembers(req, res) {
    try {
      const { teamId } = req.params;
      const adminId = req.admin.adminId;

      // Verify access
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const members = team.members || [];

      res.json({
        success: true,
        teamId,
        teamName: team.name,
        members: members,
        totalMembers: members.length,
        registeredMembers: members.filter(m => m.isRegistered).length,
        pendingMembers: members.filter(m => !m.isRegistered).length
      });

    } catch (error) {
      console.error("Get Members Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ================= GET SINGLE MEMBER =================
  static async getTeamMember(req, res) {
    try {
      const { teamId, memberId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const member = team.members?.find(m => m.userId === memberId);

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      res.json({
        success: true,
        member: member
      });

    } catch (error) {
      console.error("Get Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ================= UPDATE MEMBER =================
  static async updateTeamMember(req, res) {
    try {
      const { teamId, memberId } = req.params;
      const updates = req.body;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const memberIndex = team.members.findIndex(m => m.userId === memberId);
      
      if (memberIndex === -1) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Update member
      team.members[memberIndex] = {
        ...team.members[memberIndex],
        ...updates,
        updatedAt: new Date()
      };

      await db.collection("teams").doc(teamId).update({
        members: team.members
      });

      res.json({
        success: true,
        message: "Member updated successfully",
        member: team.members[memberIndex]
      });

    } catch (error) {
      console.error("Update Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
// backend/controllers/teamController.js - Updated acceptInvite

// ================= ACCEPT INVITE =================
static async acceptInvite(req, res) {
  try {
    const { token: inviteToken, teamId, name, password } = req.body;

    console.log("=== ACCEPT INVITE DEBUG ===");
    console.log("Team ID:", teamId);
    console.log("Token:", inviteToken);

    // Find team with this invite
    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team = teamDoc.data();
    
    // Find the pending invite
    const pendingInvite = team.pendingInvites?.find(invite => invite.token === inviteToken);
    
    if (!pendingInvite) {
      return res.status(404).json({ error: "Invalid or expired invitation" });
    }

    if (new Date() > pendingInvite.expiresAt) {
      return res.status(400).json({ error: "Invitation has expired" });
    }

    const email = pendingInvite.email;
    
    // Check if user already exists
    const userQuery = await db.collection("users").where("email", "==", email).get();
    let userId;
    let isNewUser = false;

    if (!userQuery.empty) {
      // User exists - update their information
      userId = userQuery.docs[0].id;
      const userData = userQuery.docs[0].data();
      
      // Update user's name if provided and different
      if (name && userData.name !== name) {
        await db.collection("users").doc(userId).update({
          name: name,
          updatedAt: new Date()
        });
      }
      
      console.log(`User ${email} already exists, updating info`);
    } else {
      // Create new user
      isNewUser = true;
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUserRef = db.collection("users").doc();
      userId = newUserRef.id;
      await newUserRef.set({
        email: email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        isRegistered: true,
        createdAt: new Date(),
        lastLogin: new Date(),
        teams: []
      });
      
      console.log(`Created new user ${email} with ID: ${userId}`);
    }

    // Check if user is already a member of this team
    const existingMember = team.members?.find(m => m.userId === userId);
    
    if (!existingMember) {
      // Add member to team
      const newMember = {
        userId: userId,
        email: email,
        name: name || email.split('@')[0],
        role: "member",
        addedAt: new Date(),
        addedBy: pendingInvite.addedBy || team.createdBy,
        isRegistered: true,
        status: "active", // Add status field
        memberData: {
          baseGroup: null,
          shiftCounts: {},
          preferences: { preferred: [], avoid: [] },
          leaves: []
        }
      };

      const updatedMembers = [...(team.members || []), newMember];
      const updatedInvites = team.pendingInvites.filter(invite => invite.token !== inviteToken);

      await db.collection("teams").doc(teamId).update({
        members: updatedMembers,
        pendingInvites: updatedInvites
      });
      
      console.log(`Added user ${email} to team ${team.name}`);
    } else {
      // Member already exists, just remove the invite
      const updatedInvites = team.pendingInvites.filter(invite => invite.token !== inviteToken);
      await db.collection("teams").doc(teamId).update({
        pendingInvites: updatedInvites
      });
      
      console.log(`User ${email} was already a member, removed pending invite`);
    }

    // Update user's teams array
    const userDoc = await db.collection("users").doc(userId).get();
    const userTeams = userDoc.data().teams || [];
    const alreadyHasTeam = userTeams.some(t => t.teamId === teamId);
    
    if (!alreadyHasTeam) {
      await db.collection("users").doc(userId).update({
        teams: [...userTeams, {
          teamId: teamId,
          teamName: team.name,
          role: "member",
          joinedAt: new Date(),
          status: "active",
          memberData: {
            baseGroup: null,
            shiftCounts: {},
            preferences: { preferred: [], avoid: [] },
            leaves: []
          }
        }]
      });
      console.log(`Updated user's teams array with team ${team.name}`);
    }

    // Send welcome email
    await emailService.sendWelcomeEmail(email, name || email.split('@')[0], team.name);

    // Generate JWT token for auto-login
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
    const authToken = jwt.sign(
      {
        userId: userId,
        email: email,
        role: "member",
        teamId: teamId,
        name: name || email.split('@')[0]
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Successfully joined the team",
      token: authToken,
      user: {
        id: userId,
        name: name || email.split('@')[0],
        email: email,
        teamId: teamId,
        status: "active"
      },
      team: {
        id: teamId,
        name: team.name
      },
      isNewUser: isNewUser
    });

  } catch (error) {
    console.error("Accept Invite Error:", error);
    res.status(500).json({ error: error.message });
  }
}
// backend/controllers/teamController.js - Add these methods

// ================= RESEND INVITATION =================
static async resendInvite(req, res) {
  try {
    const { teamId } = req.params;
    const { email } = req.body;
    const adminId = req.admin.adminId;

    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team = teamDoc.data();
    const pendingInvite = team.pendingInvites?.find(invite => invite.email === email);
    
    if (!pendingInvite) {
      return res.status(404).json({ error: "No pending invite found for this email" });
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString('hex');
    pendingInvite.token = newToken;
    pendingInvite.invitedAt = new Date();
    pendingInvite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update pending invites
    const updatedInvites = team.pendingInvites.map(invite => 
      invite.email === email ? pendingInvite : invite
    );

    await db.collection("teams").doc(teamId).update({
      pendingInvites: updatedInvites
    });

    // Get admin email
    const adminDoc = await db.collection("admins").doc(adminId).get();
    const adminEmail = adminDoc.data().email;

    // Resend email
    await emailService.sendTeamInvitation(
      email,
      team.name,
      adminEmail || "Team Administrator",
      teamId,
      newToken
    );

    res.json({
      success: true,
      message: "Invitation resent successfully"
    });

  } catch (error) {
    console.error("Resend Invite Error:", error);
    res.status(500).json({ error: error.message });
  }
}

// ================= CANCEL INVITATION =================
static async cancelInvite(req, res) {
  try {
    const { teamId } = req.params;
    const { email } = req.body;
    const adminId = req.admin.adminId;

    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team = teamDoc.data();
    const updatedInvites = team.pendingInvites?.filter(invite => invite.email !== email) || [];

    await db.collection("teams").doc(teamId).update({
      pendingInvites: updatedInvites
    });

    res.json({
      success: true,
      message: "Invitation cancelled successfully"
    });

  } catch (error) {
    console.error("Cancel Invite Error:", error);
    res.status(500).json({ error: error.message });
  }
}
  // ================= REMOVE MEMBER =================
  // backend/controllers/teamController.js - Updated removeTeamMember

// backend/controllers/teamController.js - Fixed removeTeamMember

// ================= REMOVE MEMBER =================
static async removeTeamMember(req, res) {
  try {
    const { teamId, memberId } = req.params;
    const adminId = req.admin.adminId;

    const adminDoc = await db.collection("admins").doc(adminId).get();
    const adminTeams = adminDoc.data().teams || [];
    if (!adminTeams.includes(teamId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team = teamDoc.data();
    const member = team.members?.find(m => m.userId === memberId);

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Remove from team's members array
    const updatedMembers = team.members.filter(m => m.userId !== memberId);
    await db.collection("teams").doc(teamId).update({
      members: updatedMembers
    });

    // Remove team reference from user's document
    const userDoc = await db.collection("users").doc(memberId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const userTeams = userData.teams || [];
      const updatedUserTeams = userTeams.filter(t => t.teamId !== teamId);
      
      await db.collection("users").doc(memberId).update({
        teams: updatedUserTeams
      });
    }

    // Also remove from pending invites if exists
    const updatedPendingInvites = team.pendingInvites?.filter(
      invite => invite.email !== member.email
    ) || [];
    
    await db.collection("teams").doc(teamId).update({
      pendingInvites: updatedPendingInvites
    });

    res.json({
      success: true,
      message: "Member removed successfully",
      // Return the updated member list
      members: updatedMembers
    });

  } catch (error) {
    console.error("Remove Member Error:", error);
    res.status(500).json({ error: error.message });
  }
}
  // ================= REBUILD SHIFT COUNTS =================
  static async rebuildShiftCounts(req, res) {
    try {
      const { teamId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Get all rosters
      const rostersSnap = await db
        .collection("teams")
        .doc(teamId)
        .collection("rosters")
        .get();

      const team = teamDoc.data();
      const members = team.members || [];
      
      // Initialize counts
      const userCounts = {};
      members.forEach(member => {
        userCounts[member.userId] = {};
      });

      // Calculate shift counts
      for (const rosterDoc of rostersSnap.docs) {
        const roster = rosterDoc.data().roster || {};
        const counted = new Set();

        for (const day in roster) {
          roster[day].forEach(entry => {
            if (!entry || entry.shift === "OFF") return;

            const key = `${rosterDoc.id}_${entry.userId}`;
            if (counted.has(key)) return;

            if (userCounts[entry.userId]) {
              userCounts[entry.userId][entry.shift] =
                (userCounts[entry.userId][entry.shift] || 0) + 1;
              counted.add(key);
            }
          });
        }
      }

      // Update members with new counts
      const updatedMembers = members.map(member => ({
        ...member,
        memberData: {
          ...member.memberData,
          shiftCounts: userCounts[member.userId] || {}
        }
      }));

      await db.collection("teams").doc(teamId).update({
        members: updatedMembers
      });

      res.json({
        success: true,
        message: "Shift counts rebuilt",
        shiftCounts: userCounts
      });

    } catch (error) {
      console.error("Rebuild Shift Counts Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TeamController;