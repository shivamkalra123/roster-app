// backend/controllers/team/getTeamMembers.js
const { verifyAdminAccess, getTeam } = require("./utils");

module.exports = async (req, res) => {
  try {
    const { teamId } = req.params;
    const adminId = req.admin.adminId;

    const hasAccess = await verifyAdminAccess(adminId, teamId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const members = team.members || [];
    const pendingInvites = team.pendingInvites || [];

    res.json({
      success: true,
      teamId,
      teamName: team.name,
      members: members,
      pendingInvites: pendingInvites,
      totalMembers: members.length,
      registeredMembers: members.filter(m => m.isRegistered).length,
      pendingMembers: members.filter(m => !m.isRegistered).length,
      totalPendingInvites: pendingInvites.length
    });

  } catch (error) {
    console.error("Get Members Error:", error);
    res.status(500).json({ error: error.message });
  }
};