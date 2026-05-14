// backend/controllers/team/getTeam.js
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

    res.json({
      success: true,
      team: {
        ...team,
        teamId: teamId,
        memberCount: (team.members || []).length,
        pendingCount: (team.pendingInvites || []).length
      }
    });

  } catch (error) {
    console.error("Get Team Error:", error);
    res.status(500).json({ error: error.message });
  }
};