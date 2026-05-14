// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");

router.post("/login", AuthController.login);
router.post("/member-login", AuthController.memberLogin);
router.get("/verify", AuthController.verifyToken);

module.exports = router;