// routes/memberRoutes.js
const express = require("express");
const router = express.Router();

const db = require("../config/firebase");
const memberAuth = require("../middleware/memberMiddleware");

// 🔥 GET MY ROSTER
router.get("/roster/:year/:month", memberAuth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { teamId, userId } = req.user;

    const doc = await db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .doc(`${year}-${month}`)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Roster not found" });
    }

    const roster = doc.data().roster;

    // 🔥 filter only this user's shifts
    const myRoster = {};

    Object.keys(roster).forEach(day => {
      const entry = roster[day].find(r => r.userId === userId);
      if (entry) {
        myRoster[day] = entry;
      }
    });

    res.json({
      success: true,
      roster: myRoster
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;