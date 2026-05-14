// routes/rosterRoutes.js
const express = require("express");
const router = express.Router();
const RosterController = require("../controllers/rosterController");
const authMiddleware = require("../middleware/authMiddleware");
const RosterService = require("../services/rosterService");
const ShiftSwapService = require("../services/shiftSwapService");

// All routes are protected
router.use(authMiddleware);

// Roster management routes
router.post("/:teamId/preview", RosterController.previewRoster);
router.post("/:teamId/confirm", RosterController.confirmRoster);
router.get("/:teamId/:year/:month", RosterController.getRoster);
router.delete("/:teamId/:year/:month", RosterController.deleteRoster);
router.post("/:teamId/debug", RosterController.debugRoster);

// Shift configuration routes
router.get("/:teamId/shifts", RosterController.getShifts);
router.put("/:teamId/shifts", RosterController.setShifts);
router.get("/:teamId/config", RosterController.getShiftConfig);
router.put("/:teamId/config", RosterController.updateShiftConfig);

// ==================== SHIFT SWAPPING ROUTES ====================

// Get available users for swapping
router.get('/:teamId/:year/:month/:day/swap-available/:userId', async (req, res) => {
  try {
    const { teamId, year, month, day, userId } = req.params;
    console.log(`🔄 Fetching available users for swap - Team: ${teamId}, Date: ${year}-${month}-${day}, User: ${userId}`);
    
    const result = await ShiftSwapService.getAvailableSwapUsers(
      teamId, 
      parseInt(year), 
      parseInt(month), 
      parseInt(day), 
      userId
    );
    res.json(result);
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Perform a swap
router.post('/:teamId/:year/:month/:day/swap', async (req, res) => {
  try {
    const { teamId, year, month, day } = req.params;
    const { userId1, userId2, swappedBy, reason } = req.body;
    
    console.log(`🔄 Swapping shifts - Day: ${day}, User1: ${userId1}, User2: ${userId2}`);
    
    const result = await ShiftSwapService.swapShifts(
      teamId, 
      parseInt(year), 
      parseInt(month), 
      parseInt(day), 
      userId1, 
      userId2, 
      swappedBy, 
      reason
    );
    res.json(result);
  } catch (error) {
    console.error('Swap error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get swap history
router.get('/:teamId/:year/:month/swap-history', async (req, res) => {
  try {
    const { teamId, year, month } = req.params;
    console.log(`📜 Getting swap history for ${year}-${month}`);
    
    const result = await ShiftSwapService.getSwapHistory(
      teamId, 
      parseInt(year), 
      parseInt(month)
    );
    res.json(result);
  } catch (error) {
    console.error('Get swap history error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Revert a swap
router.post('/:teamId/:year/:month/swap-revert/:swapId', async (req, res) => {
  try {
    const { teamId, year, month, swapId } = req.params;
    const { revertedBy } = req.body;
    
    console.log(`↩️ Reverting swap ${swapId}`);
    
    const result = await ShiftSwapService.revertSwap(
      teamId, 
      parseInt(year), 
      parseInt(month), 
      swapId, 
      revertedBy
    );
    res.json(result);
  } catch (error) {
    console.error('Revert swap error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Validate swap before executing
router.post('/:teamId/:year/:month/:day/validate-swap', async (req, res) => {
  try {
    const { teamId, year, month, day } = req.params;
    const { userId1, userId2 } = req.body;
    
    console.log(`✅ Validating swap for day ${day} between users`);
    
    const result = await ShiftSwapService.validateSwap(
      teamId, 
      parseInt(year), 
      parseInt(month), 
      parseInt(day), 
      userId1, 
      userId2
    );
    res.json(result);
  } catch (error) {
    console.error('Validate swap error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Statistics routes
router.get("/:teamId/statistics", RosterController.getRosterStatistics);

module.exports = router;