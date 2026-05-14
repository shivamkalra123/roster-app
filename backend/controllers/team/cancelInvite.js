// backend/controllers/team/cancelInvite.js
const { verifyAdminAccess, getTeam, updateTeam } = require("./utils");

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

    // Check if pending invite exists
    const pendingInvite = team.pendingInvites?.find(invite => invite.email === email);
    if (!pendingInvite) {
      return res.status(404).json({ error: "No pending invite found for this email" });
    }

    // Remove the invite from pendingInvites array
    const updatedInvites = team.pendingInvites.filter(invite => invite.email !== email);

    // Update team document
    await updateTeam(teamId, { pendingInvites: updatedInvites });

    console.log(`✅ Invitation cancelled for ${email} in team ${team.name}`);

    res.json({
      success: true,
      message: `Invitation cancelled successfully for ${email}`,
      cancelledEmail: email
    });

  } catch (error) {
    console.error("Cancel Invite Error:", error);
    res.status(500).json({ error: error.message });
  }
};