const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

module.exports = (
  req,
  res,
  next
) => {

  const token =
    req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {

    const decoded =
      jwt.verify(token, JWT_SECRET);

    console.log(
      "DECODED TOKEN:",
      decoded
    );

    // MEMBER TOKEN
    if (decoded.userId) {
      req.user = decoded;
    }

    // ADMIN TOKEN
    if (decoded.adminId) {
      req.admin = decoded;
    }

    next();

  } catch (error) {

    console.error(
      "JWT ERROR:",
      error
    );

    res.status(401).json({
      error: "Invalid token"
    });
  }
};
