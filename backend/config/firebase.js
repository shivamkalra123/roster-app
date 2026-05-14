const admin = require("firebase-admin");

// Try environment variable first, fallback to file
let serviceAccount;

if (process.env.FIREBASE_KEY) {
  // Use environment variable (production)
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
    console.log("✅ Using Firebase credentials from environment variable");
  } catch (error) {
    console.error("❌ Failed to parse FIREBASE_KEY environment variable");
    throw error;
  }
} else {
  // Use local file (development)
  try {
    serviceAccount = require("./serviceAccountKey.json");
    console.log("✅ Using Firebase credentials from serviceAccountKey.json");
  } catch (error) {
    console.error("❌ serviceAccountKey.json not found!");
    console.error("Please download from Firebase Console and save as:");
    console.error("  backend/config/serviceAccountKey.json");
    console.error("Or set FIREBASE_KEY environment variable.");
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
module.exports = db; // For backward compatibility (db.collection will work)
module.exports.db = db;

module.exports.default = db;