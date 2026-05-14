// middleware/memberMiddleware.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = "your_secret_key";

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "member") {
      return res.status(403).json({ error: "Members only" });
    }

    req.user = decoded;
    next();

  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};