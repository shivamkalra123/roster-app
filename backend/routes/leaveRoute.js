const express = require('express');

const router = express.Router();

const LeaveController = require('../controllers/leaveController');

const authMiddleware = require('../middleware/authMiddleware');

// ================= MEMBER =================

// Apply leave
router.post(
  '/apply',
  authMiddleware,
  LeaveController.applyLeave
);

// Get my leaves
router.get(
  '/my',
  authMiddleware,
  LeaveController.getMyLeaves
);

// ================= ADMIN =================

// Get all leave requests of team
router.get(
  '/team/:teamId',
  authMiddleware,
  LeaveController.getTeamLeaves
);

// Approve / Reject leave
router.patch(
  '/:leaveId',
  authMiddleware,
  LeaveController.updateLeaveStatus
);

module.exports = router;