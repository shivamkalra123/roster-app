const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");

router.post("/bulk", UserController.bulkCreateUsers);

router.post("/:teamId", UserController.createUser);
router.post("/rebuild-shift-counts/:teamId", UserController.rebuildShiftCounts);
router.post("/init-jan-march/:teamId", UserController.initJanMarch);

module.exports = router;