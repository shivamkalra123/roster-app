// backend/controllers/team/updateTeamMember.js
const { verifyAdminAccess, getTeam, updateTeam } = require("./utils");

module.exports = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const updates = req.body;
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

    // Find the member
    const memberIndex = team.members?.findIndex(m => m.userId === memberId);
    
    if (memberIndex === -1 || memberIndex === undefined) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Update member
    const updatedMembers = [...team.members];
    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      ...updates,
      updatedAt: new Date()
    };

    // Update team document
    await updateTeam(teamId, { members: updatedMembers });

    // Also update user's document if they are registered
    const member = updatedMembers[memberIndex];
    if (member.isRegistered) {
      const userDoc = await db.collection("users").doc(memberId).get();
      if (userDoc.exists) {
        const userTeams = userDoc.data().teams || [];
        const userTeamIndex = userTeams.findIndex(t => t.teamId === teamId);
        
        if (userTeamIndex !== -1) {
          userTeams[userTeamIndex] = {
            ...userTeams[userTeamIndex],
            ...updates,
            updatedAt: new Date()
          };
          await db.collection("users").doc(memberId).update({ teams: userTeams });
        }
      }
    }

    res.json({
      success: true,
      message: "Member updated successfully",
      member: updatedMembers[memberIndex]
    });

  } catch (error) {
    console.error("Update Member Error:", error);
    res.status(500).json({ error: error.message });
  }
};