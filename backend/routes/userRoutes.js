// routes/teamMemberRoutes.js
const express = require("express");
const router = express.Router({ mergeParams: true }); // Merge params to access teamId
const TeamMemberController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes are protected and require teamId in params
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