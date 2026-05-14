// backend/controllers/team/getTeams.js
const db = require("../../config/firebase");

module.exports = async (req, res) => {
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

    res.json({ success: true, teams });

  } catch (error) {
    console.error("Get Teams Error:", error);
    res.status(500).json({ error: error.message });
  }
};