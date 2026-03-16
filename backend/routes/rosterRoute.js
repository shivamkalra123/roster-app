const express = require("express");
const router = express.Router();
const RosterController = require("../controllers/rosterController");

router.post("/generate", RosterController.generateRoster);
router.get("/:teamId/:year/:month", RosterController.getRoster);

module.exports = router;