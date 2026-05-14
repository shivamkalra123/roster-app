// backend/controllers/team/resendInvite.js
const crypto = require("crypto");
const emailService = require("../../services/emailService");
const { verifyAdminAccess, getAdminDetails, getTeam, updateTeam } = require("./utils");

module.exports = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email } = req.body;
    const adminId = req.admin.adminId;

    // Verify admin has access to this team
    const hasAccess = await verifyAdminAccess(adminId, teamId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get team details
    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Find the pending invite
    const pendingInviteIndex = team.pendingInvites?.findIndex(invite => invite.email === email);
    
    if (pendingInviteIndex === -1 || pendingInviteIndex === undefined) {
      return res.status(404).json({ error: "No pending invite found for this email" });
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString('hex');
    
    // Update the existing invite with new token and dates
    const updatedInvite = {
      ...team.pendingInvites[pendingInviteIndex],
      token: newToken,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    // Update the pendingInvites array
    const updatedInvites = [...team.pendingInvites];
    updatedInvites[pendingInviteIndex] = updatedInvite;

    // Update team document
    await updateTeam(teamId, { pendingInvites: updatedInvites });

    // Get admin details for email
    const adminData = await getAdminDetails(adminId);
    const adminEmail = adminData?.email || "Team Administrator";

    // Resend the invitation email
    await emailService.sendTeamInvitation(
      email,
      team.name,
      adminEmail,
      teamId,
      newToken
    );

    console.log(`✅ Invitation resent to ${email} for team ${team.name}`);

    res.json({
      success: true,
      message: `Invitation resent successfully to ${email}`,
      resentTo: email,
      newExpiry: updatedInvite.expiresAt
    });

  } catch (error) {
    console.error("Resend Invite Error:", error);
    res.status(500).json({ error: error.message });
  }
};