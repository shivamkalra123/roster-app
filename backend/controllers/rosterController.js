// controllers/rosterController.js
const RosterService = require("../services/rosterService");
const db = require("../config/firebase");

class RosterController {

  // ==================== PREVIEW ROSTER ====================
  static async previewRoster(req, res) {
    try {
      const { teamId } = req.params;
      const { year, month } = req.body;
      const adminId = req.admin.adminId;

      if (!teamId || !year || !month) {
        return res.status(400).json({
          error: "teamId, year, month required"
        });
      }

      // Verify admin has access to this team
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const preview = await RosterService.generateRosterPreview(teamId, parseInt(year), parseInt(month));

      res.json({
        success: true,
        type: "PREVIEW",
        ...preview
      });

    } catch (error) {
      console.error("Preview Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== CONFIRM ROSTER ====================
  static async confirmRoster(req, res) {
    try {
      const { teamId } = req.params;
      const { year, month, confirmationToken } = req.body;
      const adminId = req.admin.adminId;

      if (!teamId || !year || !month) {
        return res.status(400).json({
          error: "teamId, year, month required"
        });
      }

      if (confirmationToken !== "CONFIRM") {
        return res.status(400).json({
          error: "Pass confirmationToken: 'CONFIRM'"
        });
      }

      // Verify admin has access
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await RosterService.confirmAndSaveRoster(
        teamId,
        parseInt(year),
        parseInt(month),
        confirmationToken
      );

      res.json({
        success: true,
        type: "CONFIRMED",
        ...result
      });

    } catch (error) {
      console.error("Confirm Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== GET ROSTER ====================
  static async getRoster(req, res) {
    try {
      const { teamId, year, month } = req.params;
      const adminId = req.admin.adminId;

      // Verify admin has access
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const roster = await RosterService.getRoster(
        teamId,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        success: true,
        roster
      });

    } catch (error) {
      console.error("Get Roster Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== DELETE ROSTER ====================
  static async deleteRoster(req, res) {
    try {
      const { teamId, year, month } = req.params;
      const adminId = req.admin.adminId;

      // Verify admin has access
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await RosterService.deleteRoster(
        teamId,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error("Delete Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== SET SHIFTS ====================
  static async setShifts(req, res) {
    try {
      const { teamId } = req.params;
      const { shifts } = req.body;
      const adminId = req.admin.adminId;

      if (!teamId || !shifts || !Array.isArray(shifts)) {
        return res.status(400).json({
          error: "teamId and shifts array required"
        });
      }

      // Verify admin has access
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      await db
        .collection("teams")
        .doc(teamId)
        .collection("config")
        .doc("settings")
        .set({ shifts });

      res.json({
        success: true,
        message: "Shifts updated successfully",
        shifts
      });

    } catch (error) {
      console.error("Set Shifts Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== GET SHIFTS ====================
  static async getShifts(req, res) {
    try {
      const { teamId } = req.params;
      const adminId = req.admin.adminId;

      // Verify admin has access
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const doc = await db
        .collection("teams")
        .doc(teamId)
        .collection("config")
        .doc("settings")
        .get();

      if (!doc.exists) {
        // Return default shifts
        return res.json({
          success: true,
          shifts: [
            { id: "morning", name: "Morning", type: "morning", startTime: "06:00", endTime: "14:00" },
            { id: "evening", name: "Evening", type: "evening", startTime: "14:00", endTime: "22:00" },
            { id: "night", name: "Night", type: "night", startTime: "22:00", endTime: "06:00" }
          ]
        });
      }

      res.json({
        success: true,
        shifts: doc.data().shifts || []
      });

    } catch (error) {
      console.error("Get Shifts Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== DEBUG ROSTER ====================
  static async debugRoster(req, res) {
    try {
      const { teamId } = req.params;
      const { year, month } = req.body;
      const adminId = req.admin.adminId;

      // Verify admin has access
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await RosterService.generateRosterPreview(teamId, parseInt(year), parseInt(month));

      console.log("🧠 DEBUG ASSIGNMENTS:");
      console.log(JSON.stringify(result.assignments, null, 2));

      res.json({
        success: true,
        debug: true,
        ...result
      });

    } catch (error) {
      console.error("Debug Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
  // backend/controllers/rosterController.js - Add these methods
// controllers/rosterController.js - Add these methods

  // ==================== UPDATE SHIFT CONFIGURATION ====================
  static async updateShiftConfig(req, res) {
    try {
      const { teamId } = req.params;
      const config = req.body;
      const adminId = req.admin.adminId;

      // Verify admin access
      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Validate config
      if (!config.shifts || !config.quotas) {
        return res.status(400).json({ error: "Invalid configuration" });
      }

      const result = await RosterService.updateShiftConfig(teamId, config);
      res.json(result);

    } catch (error) {
      console.error("Update Shift Config Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== GET SHIFT CONFIGURATION ====================
  static async getShiftConfig(req, res) {
    try {
      const { teamId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const config = await RosterService.getShiftConfig(teamId);
      res.json({ success: true, config });

    } catch (error) {
      console.error("Get Shift Config Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // ==================== GET ROSTER STATISTICS ====================
  static async getRosterStatistics(req, res) {
    try {
      const { teamId } = req.params;
      const adminId = req.admin.adminId;

      const adminDoc = await db.collection("admins").doc(adminId).get();
      const adminTeams = adminDoc.data().teams || [];
      if (!adminTeams.includes(teamId)) {
        return res.status(403).json({ error: "Access denied" });
      }

      const statistics = await RosterService.getRosterStatistics(teamId);
      res.json({ success: true, statistics });

    } catch (error) {
      console.error("Get Roster Statistics Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
// ==================== UPDATE SHIFT REQUIREMENTS ====================
static async updateShiftRequirements(req, res) {
  try {
    const { teamId } = req.params;
    const requirements = req.body;
    const adminId = req.admin.adminId;

    // Verify admin access
    const adminDoc = await db.collection("admins").doc(adminId).get();
    const adminTeams = adminDoc.data().teams || [];
    if (!adminTeams.includes(teamId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await RosterService.updateShiftRequirements(teamId, requirements);
    res.json(result);
  } catch (error) {
    console.error("Update Shift Requirements Error:", error);
    res.status(500).json({ error: error.message });
  }
}

// ==================== GET SHIFT REQUIREMENTS ====================
static async getShiftRequirements(req, res) {
  try {
    const { teamId } = req.params;
    const adminId = req.admin.adminId;

    const adminDoc = await db.collection("admins").doc(adminId).get();
    const adminTeams = adminDoc.data().teams || [];
    if (!adminTeams.includes(teamId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const requirements = await RosterService.getShiftRequirements(teamId);
    res.json({ success: true, requirements });
  } catch (error) {
    console.error("Get Shift Requirements Error:", error);
    res.status(500).json({ error: error.message });
  }
}

  // ==================== GET MEMBER ROSTER (for members) ====================
  static async getMemberRoster(req, res) {
    try {
      const { teamId, memberId, year, month } = req.params;
      
      // For member access, we don't check admin - they access their own roster
      // But we should verify the member belongs to this team
      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: "Team not found" });
      }

      const team = teamDoc.data();
      const member = team.members?.find(m => m.userId === memberId);
      
      if (!member) {
        return res.status(403).json({ error: "Access denied" });
      }

      const roster = await RosterService.getMemberRoster(
        teamId,
        memberId,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        success: true,
        roster
      });

    } catch (error) {
      console.error("Get Member Roster Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = RosterController;