const db = require("../config/firebase");

module.exports = async (req, res, next) => {
  try {
    const teamId =
      req.body.teamId ||
      req.params.teamId;

    if (!teamId) {
      return res.status(400).json({ error: "teamId required" });
    }

    const adminId = req.admin.adminId;

    const adminDoc = await db.collection("admins").doc(adminId).get();

    if (!adminDoc.exists) {
      return res.status(401).json({ error: "Admin not found" });
    }

    const admin = adminDoc.data();

    if (!admin.teams?.includes(teamId)) {
      return res.status(403).json({
        error: "Access denied to this team"
      });
    }

    req.teamId = teamId; // 🔥 trusted

    next();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};