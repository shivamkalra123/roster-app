// backend/controllers/team/addTeamMember.js
const crypto = require("crypto");
const emailService = require("../../services/emailService");
const { verifyAdminAccess, getAdminDetails, getTeam, updateTeam, getUserByEmail } = require("./utils");

module.exports = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, name, baseGroup = null } = req.body;
    const adminId = req.admin.adminId;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    const hasAccess = await verifyAdminAccess(adminId, teamId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const existingMember = team.members?.find(m => m.email === email);
    if (existingMember) {
      return res.status(400).json({ error: "Member already exists in team" });
    }

    const existingInvite = team.pendingInvites?.find(invite => invite.email === email);
    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    const user = await getUserByEmail(email);
    const adminData = await getAdminDetails(adminId);

    if (user) {
      // Update or create pending invite
      const updatedInvite = existingInvite || {
        email: email,
        token: inviteToken,
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
      
      if (!existingInvite) {
        updatedInvite.token = inviteToken;
        updatedInvite.invitedAt = new Date();
        updatedInvite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      let updatedPendingInvites = [...(team.pendingInvites || [])];
      const inviteIndex = updatedPendingInvites.findIndex(invite => invite.email === email);
      
      if (inviteIndex !== -1) {
        updatedPendingInvites[inviteIndex] = updatedInvite;
      } else {
        updatedPendingInvites.push(updatedInvite);
      }
      
      await updateTeam(teamId, { pendingInvites: updatedPendingInvites });
      
      const updatedMembers = (team.members || []).filter(m => m.email !== email);
      if (updatedMembers.length !== (team.members || []).length) {
        await updateTeam(teamId, { members: updatedMembers });
      }
      
      await emailService.sendTeamInvitation(email, team.name, adminData.email, teamId, inviteToken);
      
      return res.json({
        success: true,
        message: "Invitation sent successfully. User needs to accept to join the team.",
        inviteSent: true,
        requiresAcceptance: true
      });
    } else {
      // Create new pending user
      const newUserRef = db.collection("users").doc();
      const userId = newUserRef.id;
      
      await newUserRef.set({
        email,
        name,
        isRegistered: false,
        createdAt: new Date(),
        inviteToken: inviteToken,
        teams: []
      });
      
      const newPendingInvite = {
        email: email,
        token: inviteToken,
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
      
      const updatedPendingInvites = [...(team.pendingInvites || []), newPendingInvite];
      await updateTeam(teamId, { pendingInvites: updatedPendingInvites });
      
      await emailService.sendTeamInvitation(email, team.name, adminData.email, teamId, inviteToken);
      
      return res.json({
        success: true,
        message: "Invitation sent successfully",
        inviteSent: true,
        requiresAcceptance: true
      });
    }

  } catch (error) {
    console.error("Add Member Error:", error);
    res.status(500).json({ error: error.message });
  }
};