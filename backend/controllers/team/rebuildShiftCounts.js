// backend/controllers/team/rebuildShiftCounts.js
const db = require("../../config/firebase");
const { verifyAdminAccess, getTeam, updateTeam } = require("./utils");

module.exports = async (req, res) => {
  try {
    const { teamId } = req.params;
    const adminId = req.admin.adminId;

    // Verify admin has access
    const hasAccess = await verifyAdminAccess(adminId, teamId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get team details
    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Get all rosters for this team
    const rostersSnap = await db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .get();

    const members = team.members || [];
    
    // Initialize counts
    const userCounts = {};
    members.forEach(member => {
      userCounts[member.userId] = {};
    });

    // Calculate shift counts from rosters
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

    await updateTeam(teamId, { members: updatedMembers });

    res.json({
      success: true,
      message: "Shift counts rebuilt successfully",
      shiftCounts: userCounts
    });

  } catch (error) {
    console.error("Rebuild Shift Counts Error:", error);
    res.status(500).json({ error: error.message });
  }
};