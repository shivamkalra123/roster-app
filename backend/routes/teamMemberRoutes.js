// backend/routes/teamMemberRoutes.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const TeamMemberController = require("../controllers/teamMemberController");
const UserAuthController = require("../controllers/userAuthController");
const authMiddleware = require("../middleware/authMiddleware");

// ==================== PUBLIC ROUTES (No Auth) ====================
// These routes don't require authentication
router.post("/login", UserAuthController.login);
router.post("/register", UserAuthController.register);

// ==================== PROTECTED ROUTES (Require Auth) ====================
// All routes below require authentication
router.use(authMiddleware);

// Member management
router.post("/members", TeamMemberController.addMember);
router.post("/members/bulk", TeamMemberController.bulkAddMembers);
router.get("/members", TeamMemberController.getMembers);
router.get("/members/:memberId", TeamMemberController.getMember);
router.put("/members/:memberId", TeamMemberController.updateMember);
router.put("/members/:memberId/shift-counts", TeamMemberController.updateShiftCounts);
router.delete("/members/:memberId", TeamMemberController.removeMember);

// Utility routes
router.post("/rebuild-shift-counts", TeamMemberController.rebuildShiftCounts);

module.exports = router;