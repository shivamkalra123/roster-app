// backend/controllers/team/bulkAddMembers.js
const crypto = require("crypto");
const emailService = require("../../services/emailService");
const { verifyAdminAccess, getAdminDetails, getTeam, updateTeam, getUserByEmail } = require("./utils");
const db = require("../../config/firebase");

module.exports = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { members } = req.body;
    const adminId = req.admin.adminId;

    console.log("=== BULK ADD MEMBERS DEBUG ===");
    console.log("Team ID:", teamId);
    console.log("Members count:", members?.length);

    if (!members || !members.length) {
      return res.status(400).json({ error: "Members array is required" });
    }

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

    const adminData = await getAdminDetails(adminId);
    const addedMembers = [];
    const invitedMembers = [];
    const failedMembers = [];

    // IMPORTANT: Get the current pending invites
    let currentPendingInvites = [...(team.pendingInvites || [])];
    let currentMembers = [...(team.members || [])];
    
    console.log("Current pending invites count:", currentPendingInvites.length);
    console.log("Current members count:", currentMembers.length);

    for (const member of members) {
      const { email, name, baseGroup = null } = member;

      if (!email || !name) {
        failedMembers.push({ email, reason: "Email and name are required" });
        continue;
      }

      // Check if member already exists in team
      const existingMember = currentMembers.find(m => m.email === email);
      if (existingMember) {
        failedMembers.push({ email, reason: "Member already exists in team" });
        continue;
      }

      // Check if already has a pending invite
      const existingInvite = currentPendingInvites.find(invite => invite.email === email);
      
      // Generate unique invite token for THIS member
      const inviteToken = crypto.randomBytes(32).toString('hex');
      
      // Check if user exists in system
      const user = await getUserByEmail(email);

      if (user) {
        // User exists - create pending invite for them to re-join
        const newPendingInvite = {
          email: email,
          token: inviteToken,
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          addedBy: adminId,
          name: name
        };
        
        // Add to pending invites array (don't replace)
        currentPendingInvites.push(newPendingInvite);
        
        // Send invitation email
        await emailService.sendTeamInvitation(
          email,
          team.name,
          adminData?.email || "Team Administrator",
          teamId,
          inviteToken
        );
        
        invitedMembers.push({ email, name, status: "invited" });
        console.log(`✅ Added pending invite for existing user: ${email}`);
      } else {
        // Create pending user in users collection
        const newUserRef = db.collection("users").doc();
        const userId = newUserRef.id;
        
        await newUserRef.set({
          email,
          name,
          isRegistered: false,
          createdAt: new Date(),
          inviteToken: inviteToken,
          teams: []
        });
        
        // Add to pending invites
        const newPendingInvite = {
          email: email,
          token: inviteToken,
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          addedBy: adminId,
          name: name
        };
        
        currentPendingInvites.push(newPendingInvite);
        
        // Send invitation email
        await emailService.sendTeamInvitation(
          email,
          team.name,
          adminData?.email || "Team Administrator",
          teamId,
          inviteToken
        );
        
        invitedMembers.push({ email, name, status: "invited" });
        console.log(`✅ Created new pending user and added invite: ${email}`);
      }
    }

    // Update the team document with ALL pending invites at once
    await updateTeam(teamId, { 
      pendingInvites: currentPendingInvites,
      members: currentMembers 
    });

    console.log(`✅ Bulk add complete. Total pending invites now: ${currentPendingInvites.length}`);
    console.log(`Invited: ${invitedMembers.length}, Failed: ${failedMembers.length}`);

    res.json({
      success: true,
      message: `Successfully processed ${members.length} members`,
      addedMembers: addedMembers.length,
      invitedMembers: invitedMembers.length,
      failedMembers: failedMembers.length,
      details: {
        added: addedMembers,
        invited: invitedMembers,
        failed: failedMembers
      },
      pendingInvitesCount: currentPendingInvites.length
    });

  } catch (error) {
    console.error("Bulk Add Members Error:", error);
    res.status(500).json({ error: error.message });
  }
};