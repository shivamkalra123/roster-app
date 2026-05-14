// backend/controllers/team/createTeam.js
const db = require("../../config/firebase");
const emailService = require("../../services/emailService");
const { generateInviteToken, getAdminDetails, getUserByEmail } = require("./utils");

module.exports = async (req, res) => {
  try {
    const { name, memberEmails = [] } = req.body;
    const adminId = req.admin.adminId;

    if (!name) {
      return res.status(400).json({ error: "Team name required" });
    }

    const adminData = await getAdminDetails(adminId);
    if (!adminData) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const teamId = name.toLowerCase().replace(/\s+/g, "-");
    const existing = await db.collection("teams").doc(teamId).get();
    if (existing.exists) {
      return res.status(400).json({ error: "Team already exists" });
    }

    const members = [];
    const pendingInvites = [];

    for (const email of memberEmails) {
      const inviteToken = generateInviteToken();
      const user = await getUserByEmail(email);

      if (user) {
        members.push({
          userId: user.id,
          email: email,
          name: user.name || email,
          role: "member",
          addedAt: new Date(),
          addedBy: adminId,
          isRegistered: true,
          memberData: {
            baseGroup: null,
            shiftCounts: {},
            preferences: { preferred: [], avoid: [] },
            leaves: []
          }
        });
        await emailService.sendWelcomeEmail(email, user.name || email, name);
      } else {
        pendingInvites.push({
          email: email,
          token: inviteToken,
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await emailService.sendTeamInvitation(email, name, adminData.email, teamId, inviteToken);
      }
    }

    await db.collection("teams").doc(teamId).set({
      name,
      createdBy: adminId,
      createdAt: new Date(),
      members: members,
      pendingInvites: pendingInvites,
      settings: {
        allowMemberInvites: false,
        requireApproval: true
      }
    });

    const adminRef = db.collection("admins").doc(adminId);
    const currentAdminTeams = adminData.teams || [];
    await adminRef.update({ teams: [...currentAdminTeams, teamId] });

    for (const member of members) {
      const userRef = db.collection("users").doc(member.userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const currentUserTeams = userDoc.data().teams || [];
        await userRef.update({
          teams: [...currentUserTeams, {
            teamId: teamId,
            teamName: name,
            role: member.role,
            addedAt: new Date(),
            memberData: member.memberData
          }]
        });
      }
    }

    res.json({
      success: true,
      teamId,
      message: "Team created successfully",
      addedMembers: members.length,
      pendingInvites: pendingInvites.length,
      invitesSent: pendingInvites.length
    });

  } catch (error) {
    console.error("Create Team Error:", error);
    res.status(500).json({ error: error.message });
  }
};