const admin = require('firebase-admin');

const db = admin.firestore();

class LeaveController {

  // ================= APPLY LEAVE =================
  static async applyLeave(req, res) {
    try {

      const {
        teamId,
        leaveType,
        reason,
        startDate,
        endDate
      } = req.body;

      const userId = req.user.userId;

      // Validation
      if (
        !teamId ||
        !leaveType ||
        !reason ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          error: 'All fields are required'
        });
      }

      // Validate date range
      if (
        new Date(endDate) <
        new Date(startDate)
      ) {
        return res.status(400).json({
          error: 'Invalid date range'
        });
      }

      // Get user details
      const userDoc = await db
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const userData = userDoc.data();

      // Create leave request
      const leaveRef = await db
        .collection('teams')
        .doc(teamId)
        .collection('leaveRequests')
        .add({
          userId,
          userName: userData.name,
          userEmail: userData.email,

          teamId,

          leaveType,
          reason,

          startDate,
          endDate,

          status: 'pending',

          appliedAt:
            admin.firestore.FieldValue.serverTimestamp(),

          reviewedAt: null,
          reviewedBy: null,
          adminComment: ''
        });

      return res.json({
        success: true,
        leaveId: leaveRef.id,
        message: 'Leave applied successfully'
      });

    } catch (error) {

      console.error(
        'Apply Leave Error:',
        error
      );

      return res.status(500).json({
        error: error.message
      });
    }
  }

  // ================= GET MY LEAVES =================
  static async getMyLeaves(req, res) {
    try {

      const userId = req.user.userId;

      const snapshot = await db
        .collectionGroup('leaveRequests')
        .where('userId', '==', userId)
        .orderBy('appliedAt', 'desc')
        .get();

      const leaves = [];

      snapshot.forEach(doc => {
        leaves.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return res.json({
        success: true,
        leaves
      });

    } catch (error) {

      console.error(
        'Get My Leaves Error:',
        error
      );

      return res.status(500).json({
        error: error.message
      });
    }
  }

  // ================= GET TEAM LEAVES =================
  static async getTeamLeaves(req, res) {
    try {

      const { teamId } = req.params;

      const snapshot = await db
        .collection('teams')
        .doc(teamId)
        .collection('leaveRequests')
        .orderBy('appliedAt', 'desc')
        .get();

      const leaves = [];

      snapshot.forEach(doc => {
        leaves.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return res.json({
        success: true,
        leaves
      });

    } catch (error) {

      console.error(
        'Get Team Leaves Error:',
        error
      );

      return res.status(500).json({
        error: error.message
      });
    }
  }

  // ================= APPROVE / REJECT =================
  // ================= APPROVE / REJECT =================
// ================= APPROVE / REJECT =================
static async updateLeaveStatus(req, res) {
  try {

    const { leaveId } = req.params;

    const {
      status,
      adminComment
    } = req.body;

    if (
      !['approved', 'rejected']
        .includes(status)
    ) {
      return res.status(400).json({
        error: 'Invalid status'
      });
    }

    // ================= FIND LEAVE =================
    const teamsSnapshot = await db
      .collection('teams')
      .get();

    let leaveDoc = null;

    for (const team of teamsSnapshot.docs) {

      const doc = await db
        .collection('teams')
        .doc(team.id)
        .collection('leaveRequests')
        .doc(leaveId)
        .get();

      if (doc.exists) {
        leaveDoc = doc;
        break;
      }
    }

    if (!leaveDoc) {
      return res.status(404).json({
        error: 'Leave request not found'
      });
    }

    // ================= UPDATE STATUS ONLY =================
    await leaveDoc.ref.update({

      status,

      adminComment:
        adminComment || '',

      reviewedBy:
        req.admin?.adminId || 'admin',

      reviewedAt:
        admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({
      success: true,
      message:
        `Leave ${status} successfully`
    });

  } catch (error) {

    console.error(
      'Update Leave Status Error:',
      error
    );

    return res.status(500).json({
      error: error.message
    });
  }
}
}

module.exports = LeaveController;