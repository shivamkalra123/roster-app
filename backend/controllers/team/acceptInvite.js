// backend/controllers/team/acceptInvite.js
const jwt = require("jsonwebtoken");
const emailService = require("../../services/emailService");
const { getTeam, updateTeam, getUserByEmail, createUser } = require("./utils");
const db = require("../../config/firebase");

module.exports = async (req, res) => {
  try {
    const { token: inviteToken, teamId, name, password } = req.body;

    console.log("=== ACCEPT INVITE DEBUG ===");
    console.log("Team ID:", teamId);
    console.log("Token:", inviteToken);
    console.log("Name:", name);

    // Get team
    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    console.log("Total pending invites before:", team.pendingInvites?.length || 0);

    // Find the specific pending invite
    let pendingInvite = null;
    let pendingInviteIndex = -1;
    
    if (team.pendingInvites && Array.isArray(team.pendingInvites)) {
      for (let i = 0; i < team.pendingInvites.length; i++) {
        const invite = team.pendingInvites[i];
        
        let tokenValue = null;
        
        if (typeof invite === 'object' && invite.token) {
          tokenValue = invite.token;
        } else if (typeof invite === 'object' && invite.inviteToken) {
          tokenValue = invite.inviteToken;
        }
        
        if (tokenValue === inviteToken) {
          pendingInvite = invite;
          pendingInviteIndex = i;
          break;
        }
      }
    }
    
    if (!pendingInvite) {
      console.log("No pending invite found for token:", inviteToken);
      return res.status(404).json({ error: "Invalid or expired invitation" });
    }

    // Get email from pending invite
    const email = pendingInvite.email;
    
    // Check if expired
    if (pendingInvite.expiresAt && new Date() > new Date(pendingInvite.expiresAt)) {
      return res.status(400).json({ error: "Invitation has expired" });
    }

    console.log("Accepting invite for email:", email);

    // Check if user already exists
    let user = await getUserByEmail(email);
    let isNewUser = false;

    if (!user) {
      // Create new user
      isNewUser = true;
      const userId = await createUser(email, name, password);
      user = { id: userId, name: name || email.split('@')[0] };
      console.log(`Created new user ${email} with ID: ${user.id}`);
    } else {
      console.log(`User ${email} already exists, ID: ${user.id}`);
      // Update user's name if provided
      if (name && user.name !== name) {
        await db.collection("users").doc(user.id).update({
          name: name,
          updatedAt: new Date()
        });
        user.name = name;
      }
    }

    // Check if user is already a member of this team
    const existingMember = team.members?.find(m => m.userId === user.id);
    
    if (!existingMember) {
      // Add member to team
      const newMember = {
        userId: user.id,
        email: email,
        name: user.name,
        role: "member",
        addedAt: new Date(),
        addedBy: pendingInvite.addedBy || team.createdBy,
        isRegistered: true,
        memberData: {
          baseGroup: null,
          shiftCounts: {},
          preferences: { preferred: [], avoid: [] },
          leaves: []
        }
      };

      // IMPORTANT: Only remove the specific invite, not all invites
      const updatedMembers = [...(team.members || []), newMember];
      const updatedInvites = team.pendingInvites.filter((_, index) => index !== pendingInviteIndex);

      await updateTeam(teamId, {
        members: updatedMembers,
        pendingInvites: updatedInvites
      });
      
      console.log(`✅ Added user ${email} to team ${team.name}`);
      console.log(`Removed specific invite. Remaining invites: ${updatedInvites.length}`);
    } else {
      // Member already exists, just remove the specific invite
      const updatedInvites = team.pendingInvites.filter((_, index) => index !== pendingInviteIndex);
      await updateTeam(teamId, { pendingInvites: updatedInvites });
      console.log(`User ${email} was already a member, removed only their pending invite`);
    }

    // Update user's teams array
    const userDoc = await db.collection("users").doc(user.id).get();
    const userTeams = userDoc.data().teams || [];
    const alreadyHasTeam = userTeams.some(t => t.teamId === teamId);
    
    if (!alreadyHasTeam) {
      await db.collection("users").doc(user.id).update({
        teams: [...userTeams, {
          teamId: teamId,
          teamName: team.name,
          role: "member",
          joinedAt: new Date(),
          memberData: {
            baseGroup: null,
            shiftCounts: {},
            preferences: { preferred: [], avoid: [] },
            leaves: []
          }
        }]
      });
      console.log(`✅ Updated user's teams array with team ${team.name}`);
    }

    // Send welcome email
    await emailService.sendWelcomeEmail(email, user.name, team.name);

    // Generate JWT token for auto-login
    const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
    const authToken = jwt.sign(
      {
        userId: user.id,
        email: email,
        role: "member",
        teamId: teamId,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Successfully joined the team",
      token: authToken,
      user: {
        id: user.id,
        name: user.name,
        email: email,
        teamId: teamId
      },
      team: {
        id: teamId,
        name: team.name
      },
      isNewUser: isNewUser
    });

  } catch (error) {
    console.error("Accept Invite Error:", error);
    res.status(500).json({ error: error.message });
  }
};