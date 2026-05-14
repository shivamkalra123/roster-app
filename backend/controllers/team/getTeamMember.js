// backend/controllers/team/getTeamMember.js
const { verifyAdminAccess, getTeam } = require("./utils");

module.exports = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
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

    // Find the member in the team's members array
    const member = team.members?.find(m => m.userId === memberId);

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Get additional user details if needed
    let userDetails = null;
    if (member.isRegistered) {
      const userDoc = await db.collection("users").doc(memberId).get();
      if (userDoc.exists) {
        userDetails = {
          lastLogin: userDoc.data().lastLogin,
          createdAt: userDoc.data().createdAt,
          isRegistered: userDoc.data().isRegistered
        };
      }
    }

    res.json({
      success: true,
      member: {
        ...member,
        userDetails
      }
    });

  } catch (error) {
    console.error("Get Team Member Error:", error);
    res.status(500).json({ error: error.message });
  }
};