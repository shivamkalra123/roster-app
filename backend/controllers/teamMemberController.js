// backend/controllers/teamMemberController.js
const db = require("../config/firebase");

class TeamMemberController {

  // ==================== ADD MEMBER TO TEAM ====================
  static async addMember(req, res) {
    try {
      const { teamId } = req.params;
      const { email, name, baseGroup = null, shiftCounts = {}, preferences = { preferred: [], avoid: [] }, leaves = [] } = req.body;
      const adminId = req.admin.adminId;

      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required" });
      }

      // Verify admin has access to this team
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if team exists
      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();

      // Check if member already exists
      const existingMember = team.members?.find(m => m.email === email);
      if (existingMember) {
        return res.status(400).json({ error: "Member already exists in team" });
      }

      // Check if user exists in system
      const userQuery = await db.collection("users").where("email", "==", email).get();
      let userId;
      let userExists = false;

      if (!userQuery.empty) {
        userExists = true;
        userId = userQuery.docs[0].id;
        
        // Update user's team data
        await db.collection("users").doc(userId).update({
          teams: db.FieldValue.arrayUnion({
            teamId: teamId,
            teamName: team.name,
            role: "member",
            addedAt: new Date(),
            memberData: {
              baseGroup,
              shiftCounts,
              preferences,
              leaves
            }
          })
        });
      } else {
        // Create a pending user record
        const newUserRef = db.collection("users").doc();
        userId = newUserRef.id;
        await newUserRef.set({
          email,
          name,
          isRegistered: false,
          createdAt: new Date(),
          teams: [{
            teamId: teamId,
            teamName: team.name,
            role: "member",
            addedAt: new Date(),
            memberData: {
              baseGroup,
              shiftCounts,
              preferences,
              leaves
            }
          }]
        });
      }

      // Add member to team document
      const newMember = {
        userId: userId,
        email: email,
        name: name,
        role: "member",
        addedAt: new Date(),
        addedBy: adminId,
        isRegistered: userExists,
        memberData: {
          baseGroup,
          shiftCounts,
          preferences,
          leaves
        }
      };

      await db.collection("teams").doc(teamId).update({
        members: db.FieldValue.arrayUnion(newMember)
      });

      // Remove from pending invites if exists
      if (team.pendingInvites?.includes(email)) {
        await db.collection("teams").doc(teamId).update({
          pendingInvites: db.FieldValue.arrayRemove(email)
        });
      }

      res.json({
        success: true,
        message: userExists ? "Member added successfully" : "Member invited successfully",
        member: newMember,
        isRegistered: userExists
      });

    } catch (error) {
      console.error("Add Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== BULK ADD MEMBERS ====================
  static async bulkAddMembers(req, res) {
    try {
      const { teamId } = req.params;
      const { members } = req.body;
      const adminId = req.admin.adminId;

      if (!members || !members.length) {
        return res.status(400).json({ error: "Members array is required" });
      }

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const addedMembers = [];
      const updatedMembers = [];

      for (const member of members) {
        const { email, name, baseGroup = null, shiftCounts = {}, preferences = { preferred: [], avoid: [] }, leaves = [] } = member;

        if (!email || !name) continue;

        const existingMember = team.members?.find(m => m.email === email);
        if (existingMember) {
          updatedMembers.push({ email, status: "already_exists" });
          continue;
        }

        const userQuery = await db.collection("users").where("email", "==", email).get();
        let userId;
        let userExists = false;

        if (!userQuery.empty) {
          userExists = true;
          userId = userQuery.docs[0].id;
          
          await db.collection("users").doc(userId).update({
            teams: db.FieldValue.arrayUnion({
              teamId: teamId,
              teamName: team.name,
              role: "member",
              addedAt: new Date(),
              memberData: { baseGroup, shiftCounts, preferences, leaves }
            })
          });
        } else {
          const newUserRef = db.collection("users").doc();
          userId = newUserRef.id;
          await newUserRef.set({
            email,
            name,
            isRegistered: false,
            createdAt: new Date(),
            teams: [{
              teamId: teamId,
              teamName: team.name,
              role: "member",
              addedAt: new Date(),
              memberData: { baseGroup, shiftCounts, preferences, leaves }
            }]
          });
        }

        const newMember = {
          userId,
          email,
          name,
          role: "member",
          addedAt: new Date(),
          addedBy: adminId,
          isRegistered: userExists,
          memberData: { baseGroup, shiftCounts, preferences, leaves }
        };

        addedMembers.push(newMember);
      }

      if (addedMembers.length) {
        await db.collection("teams").doc(teamId).update({
          members: db.FieldValue.arrayUnion(...addedMembers)
        });
      }

      res.json({
        success: true,
        message: `Added ${addedMembers.length} members, ${updatedMembers.length} already existed`,
        addedMembers: addedMembers,
        totalProcessed: members.length
      });

    } catch (error) {
      console.error("Bulk Add Members Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== GET ALL MEMBERS ====================
  static async getMembers(req, res) {
    try {
      const { teamId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const members = team.members || [];

      const membersWithDetails = await Promise.all(members.map(async (member) => {
        if (member.isRegistered) {
          const userDoc = await db.collection("users").doc(member.userId).get();
          const userData = userDoc.data();
          return {
            ...member,
            userDetails: {
              lastLogin: userData?.lastLogin || null,
              accountCreatedAt: userData?.createdAt || null
            }
          };
        }
        return member;
      }));

      res.json({
        success: true,
        teamId,
        teamName: team.name,
        members: membersWithDetails,
        totalMembers: members.length,
        registeredMembers: members.filter(m => m.isRegistered).length,
        pendingMembers: members.filter(m => !m.isRegistered).length
      });

    } catch (error) {
      console.error("Get Members Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== GET SINGLE MEMBER ====================
  static async getMember(req, res) {
    try {
      const { teamId, memberId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const member = team.members?.find(m => m.userId === memberId);

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      let userDetails = null;
      if (member.isRegistered) {
        const userDoc = await db.collection("users").doc(memberId).get();
        userDetails = userDoc.data();
      }

      res.json({
        success: true,
        member: {
          ...member,
          userDetails
        }
      });

    } catch (error) {
      console.error("Get Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== UPDATE MEMBER DATA ====================
  static async updateMember(req, res) {
    try {
      const { teamId, memberId } = req.params;
      const updates = req.body;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const memberIndex = team.members.findIndex(m => m.userId === memberId);
      
      if (memberIndex === -1) {
        return res.status(404).json({ error: "Member not found" });
      }

      const updatedMember = {
        ...team.members[memberIndex],
        memberData: {
          ...team.members[memberIndex].memberData,
          ...updates
        },
        updatedAt: new Date()
      };

      team.members[memberIndex] = updatedMember;

      await db.collection("teams").doc(teamId).update({
        members: team.members
      });

      const userDoc = await db.collection("users").doc(memberId).get();
      if (userDoc.exists) {
        const userTeams = userDoc.data().teams || [];
        const userTeamIndex = userTeams.findIndex(t => t.teamId === teamId);
        
        if (userTeamIndex !== -1) {
          userTeams[userTeamIndex].memberData = {
            ...userTeams[userTeamIndex].memberData,
            ...updates
          };
          await db.collection("users").doc(memberId).update({
            teams: userTeams
          });
        }
      }

      res.json({
        success: true,
        message: "Member updated successfully",
        member: updatedMember
      });

    } catch (error) {
      console.error("Update Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== UPDATE SHIFT COUNTS ====================
  static async updateShiftCounts(req, res) {
    try {
      const { teamId, memberId } = req.params;
      const { shiftCounts } = req.body;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const memberIndex = team.members.findIndex(m => m.userId === memberId);
      
      if (memberIndex === -1) {
        return res.status(404).json({ error: "Member not found" });
      }

      team.members[memberIndex].memberData.shiftCounts = shiftCounts;
      team.members[memberIndex].updatedAt = new Date();

      await db.collection("teams").doc(teamId).update({
        members: team.members
      });

      res.json({
        success: true,
        message: "Shift counts updated",
        shiftCounts
      });

    } catch (error) {
      console.error("Update Shift Counts Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== REMOVE MEMBER ====================
  static async removeMember(req, res) {
    try {
      const { teamId, memberId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const member = team.members?.find(m => m.userId === memberId);

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const updatedMembers = team.members.filter(m => m.userId !== memberId);
      await db.collection("teams").doc(teamId).update({
        members: updatedMembers
      });

      res.json({
        success: true,
        message: "Member removed successfully"
      });

    } catch (error) {
      console.error("Remove Member Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== REBUILD SHIFT COUNTS ====================
  static async rebuildShiftCounts(req, res) {
    try {
      const { teamId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const members = team.members || [];

      const rostersSnap = await db
        .collection("teams")
        .doc(teamId)
        .collection("rosters")
        .get();

      const userCounts = {};
      members.forEach(member => {
        userCounts[member.userId] = {};
      });

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

      const updatedMembers = members.map(member => ({
        ...member,
        memberData: {
          ...member.memberData,
          shiftCounts: userCounts[member.userId] || {}
        },
        shiftCountsUpdatedAt: new Date()
      }));

      await db.collection("teams").doc(teamId).update({
        members: updatedMembers
      });

      res.json({
        success: true,
        message: "Shift counts rebuilt for all members",
        shiftCounts: userCounts
      });

    } catch (error) {
      console.error("Rebuild Shift Counts Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TeamMemberController;