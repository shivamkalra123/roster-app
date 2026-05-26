// backend/controllers/teamController.js
const db = require("../config/firebase");
const emailService = require("../services/emailService");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class TeamController {

  // ================= CREATE TEAM =================
  static async createTeam(req, res) {
    try {
      const { name, memberEmails = [] } = req.body;
      const adminId = req.admin.adminId;

      if (!name) {
        return res.status(400).json({ error: "Team name required" });
      }

      const adminDoc = await db.collection("admins").doc(adminId).get();
      if (!adminDoc.exists) {
        return res.status(404).json({ error: "Admin not found" });
      }
      const adminData = adminDoc.data();
      const adminEmail = adminData.email;

      const teamId = name.toLowerCase().replace(/\s+/g, "-");

      const existing = await db.collection("teams").doc(teamId).get();
      if (existing.exists) {
        return res.status(400).json({ error: "Team already exists" });
      }

      const members = [];
      const pendingInvites = [];

      for (const email of memberEmails) {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        
        pendingInvites.push({
          email: email,
          name: email.split('@')[0],
          token: inviteToken,
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        
        await emailService.sendTeamInvitation(
          email, 
          name, 
          adminEmail || "Team Administrator", 
          teamId, 
          inviteToken
        );
      }

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

      const adminRef = db.collection("admins").doc(adminId);
      const currentAdminTeams = adminData.teams || [];
      await adminRef.update({
        teams: [...currentAdminTeams, teamId]
      });

      res.json({
        success: true,
        teamId,
        message: "Team created successfully",
        pendingInvites: pendingInvites.length,
        invitesSent: pendingInvites.length
      });

    } catch (error) {
      console.error("Create Team Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ================= ADD TEAM MEMBER =================
  static async addTeamMember(req, res) {
    try {
      const { teamId } = req.params;
      const { email, name } = req.body;
      const adminId = req.admin.adminId;

      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      
      const adminDoc = await db.collection("admins").doc(adminId).get();
      if (!adminDoc.exists) {
        return res.status(404).json({ error: "Admin not found" });
      }
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const existingMember = team.members?.find(m => m.email === email);
      if (existingMember) {
        return res.status(400).json({ error: "Member already exists in team" });
      }

      const inviteToken = crypto.randomBytes(32).toString('hex');
      
      const newPendingInvite = {
        email: email,
        name: name,
        token: inviteToken,
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
      
      const updatedPendingInvites = [...(team.pendingInvites || []), newPendingInvite];
      await db.collection("teams").doc(teamId).update({
        pendingInvites: updatedPendingInvites
      });
      
      const adminEmail = adminDoc.data().email;
      await emailService.sendTeamInvitation(
        email, 
        team.name, 
        adminEmail || "Team Administrator", 
        teamId, 
        inviteToken
      );
      
      return res.json({
        success: true,
        message: "Invitation sent successfully",
        inviteSent: true
      });
      
    } catch (error) {
      console.error("Add Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ================= ACCEPT INVITE =================
  static async acceptInvite(req, res) {
    try {
      const { token, teamId, name, password } = req.body;

      if (!token || !teamId || !name || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      
      const pendingInvites = team.pendingInvites || [];
      const invite = pendingInvites.find(inv => inv.token === token);
      
      if (!invite) {
        return res.status(400).json({ error: "Invalid or expired invitation link" });
      }
      
      const expiresAt = invite.expiresAt?.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: "Invitation has expired" });
      }
      
      const invitedEmail = invite.email;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const usersRef = db.collection("users");
      const existingUser = await usersRef.where("email", "==", invitedEmail).get();
      
      let userId;
      
      if (existingUser.empty) {
        const newUser = {
          name: name,
          email: invitedEmail,
          password: hashedPassword,
          isRegistered: true,
          role: "member",
          createdAt: new Date(),
          lastLogin: null,
          teams: [{
            teamId: teamId,
            teamName: team.name,
            role: "member",
            addedAt: new Date()
          }]
        };
        
        const userRef = await usersRef.add(newUser);
        userId = userRef.id;
        console.log("✅ New user created with password");
      } else {
        userId = existingUser.docs[0].id;
        await existingUser.docs[0].ref.update({
          name: name,
          password: hashedPassword,
          isRegistered: true,
          updatedAt: new Date()
        });
        console.log("✅ Existing user updated with password");
      }
      
      const members = team.members || [];
      const existingMember = members.find(m => m.userId === userId);
      
      if (!existingMember) {
        const newMember = {
          userId: userId,
          email: invitedEmail,
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
        
        members.push(newMember);
        await teamDoc.ref.update({ members: members });
      }
      
      const updatedInvites = pendingInvites.filter(inv => inv.token !== token);
      await teamDoc.ref.update({ pendingInvites: updatedInvites });
      
      const authToken = jwt.sign(
        {
          userId: userId,
          email: invitedEmail,
          name: name,
          role: "member",
          teamId: teamId
        },
        process.env.JWT_SECRET || "your_secret_key",
        { expiresIn: "30d" }
      );
      
      res.json({
        success: true,
        token: authToken,
        user: {
          id: userId,
          name: name,
          email: invitedEmail,
          teamId: teamId,
          teamName: team.name,
          role: "member"
        }
      });
    } catch (error) {
      console.error("Accept invite error:", error);
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

      const updatedMembers = team.members.filter(m => m.userId !== memberId);
      await db.collection("teams").doc(teamId).update({
        members: updatedMembers
      });

      const userDoc = await db.collection("users").doc(memberId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const userTeams = userData.teams || [];
        const updatedUserTeams = userTeams.filter(t => t.teamId !== teamId);
        
        await db.collection("users").doc(memberId).update({
          teams: updatedUserTeams
        });
      }

      res.json({
        success: true,
        message: "Member removed successfully"
      });

    } catch (error) {
      console.error("Remove Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TeamController;