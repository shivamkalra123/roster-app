// backend/controllers/team/removeTeamMember.js
const { verifyAdminAccess, getTeam, updateTeam, getUserByEmail } = require("./utils");

module.exports = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const adminId = req.admin.adminId;

    const hasAccess = await verifyAdminAccess(adminId, teamId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const member = team.members?.find(m => m.userId === memberId);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Remove from team's members array
    const updatedMembers = team.members.filter(m => m.userId !== memberId);
    await updateTeam(teamId, { members: updatedMembers });

    // Remove team reference from user's document
    const userDoc = await db.collection("users").doc(memberId).get();
    if (userDoc.exists) {
      const userTeams = userDoc.data().teams || [];
      const updatedUserTeams = userTeams.filter(t => t.teamId !== teamId);
      await db.collection("users").doc(memberId).update({ teams: updatedUserTeams });
    }

    // Remove from pending invites if exists
    const updatedPendingInvites = team.pendingInvites?.filter(
      invite => invite.email !== member.email
    ) || [];
    
    await updateTeam(teamId, { pendingInvites: updatedPendingInvites });

    res.json({
      success: true,
      message: "Member removed successfully",
      members: updatedMembers
    });

  } catch (error) {
    console.error("Remove Member Error:", error);
    res.status(500).json({ error: error.message });
  }
};