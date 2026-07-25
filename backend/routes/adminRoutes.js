const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/:adminId", async (req, res) => {
  try {
    if (!req.admin?.adminId) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const { adminId } = req.params;
    const adminDoc = await db.collection("admins").doc(adminId).get();

    if (!adminDoc.exists) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    const admin = adminDoc.data();

    return res.json({
      success: true,
      admin: {
        id: adminDoc.id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error("Get Admin Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
