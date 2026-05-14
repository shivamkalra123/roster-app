// backend/routes/teamRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const teamController = require("../controllers/team");

// ==================== PUBLIC ROUTES ====================
// No authentication required for accepting invites
router.post("/accept-invite", teamController.acceptInvite);

// ==================== PROTECTED ROUTES ====================
// All routes below require authentication
router.use(authMiddleware);

// ==================== TEAM MANAGEMENT ====================
// Create a new team
router.post("/create", teamController.createTeam);

// Get all teams for the logged-in admin
router.get("/", teamController.getTeams);

// Get specific team details
router.get("/:teamId", teamController.getTeam);

// ==================== MEMBER MANAGEMENT ====================
// Add a single member to a team
router.post("/:teamId/members", teamController.addTeamMember);

// Get all members of a team
router.get("/:teamId/members", teamController.getTeamMembers);

// Get a specific member from a team
router.get("/:teamId/members/:memberId", teamController.getTeamMember);

// Update a member's details in a team
router.put("/:teamId/members/:memberId", teamController.updateTeamMember);

// Remove a member from a team
router.delete("/:teamId/members/:memberId", teamController.removeTeamMember);

// ==================== INVITE MANAGEMENT ====================
// Resend an invitation to a pending member
router.post("/:teamId/resend-invite", teamController.resendInvite);
router.post("/:teamId/members/bulk", teamController.bulkAddMembers);

// Cancel a pending invitation
router.delete("/:teamId/cancel-invite", teamController.cancelInvite);

// ==================== UTILITY ROUTES ====================
// Rebuild shift counts for all members based on roster history
router.post("/:teamId/rebuild-shift-counts", teamController.rebuildShiftCounts);

module.exports = router;