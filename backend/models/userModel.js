const db = require("../config/firebase");

class UserModel {
  static async create(teamId, userData) {
    return db
      .collection("teams")
      .doc(teamId)
      .collection("users")
      .add(userData);
  }

  static async getAll(teamId) {
    const snapshot = await db
      .collection("teams")
      .doc(teamId)
      .collection("users")
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}

module.exports = UserModel;