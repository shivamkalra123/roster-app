// services/shiftSwapService.js
const db = require("../config/firebase");
const admin = require('firebase-admin');

// Initialize FieldValue safely (same as in rosterService)
let FieldValue;
try {
  FieldValue = admin.firestore.FieldValue;
  console.log('✅ FieldValue initialized successfully');
} catch (error) {
  console.error('❌ Failed to get FieldValue from admin:', error);
  // Fallback for testing
  FieldValue = {
    arrayUnion: (data) => data,
    increment: (num) => num
  };
}

class ShiftSwapService {
  
  static async getAvailableSwapUsers(teamId, year, month, day, userId) {
    try {
      const roster = await this._getRoster(teamId, year, month);
      const dayRoster = roster.roster[day];
      
      if (!dayRoster) {
        return { workingUsers: [], offUsers: [] };
      }
      
      const targetUser = dayRoster.find(a => a.userId === userId);
      if (!targetUser) {
        return { workingUsers: [], offUsers: [] };
      }
      
      const workingUsers = dayRoster
        .filter(a => a.userId !== userId)
        .map(assignment => ({
          userId: assignment.userId,
          name: assignment.name,
          currentShift: assignment.shift,
          canSwap: this._canSwapShifts(targetUser.shift, assignment.shift)
        }));
      
      const allUsers = await this._getAllUsers(teamId);
      const offUsers = allUsers
        .filter(user => !dayRoster.find(a => a.userId === user.id))
        .map(user => ({
          userId: user.id,
          name: user.name,
          currentShift: "OFF",
          canSwap: true
        }));
      
      return {
        targetUser: {
          userId: targetUser.userId,
          name: targetUser.name,
          currentShift: targetUser.shift
        },
        workingUsers,
        offUsers
      };
    } catch (error) {
      console.error('Error in getAvailableSwapUsers:', error);
      return { workingUsers: [], offUsers: [] };
    }
  }
  
  static async swapShifts(teamId, year, month, day, userId1, userId2, swappedBy, reason = "") {
    const rosterRef = db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .doc(`${year}-${month}`);
    
    const result = await db.runTransaction(async (transaction) => {
      const rosterDoc = await transaction.get(rosterRef);
      
      if (!rosterDoc.exists) {
        throw new Error(`Roster not found for ${year}-${month}`);
      }
      
      const rosterData = rosterDoc.data();
      const dayRoster = [...(rosterData.roster[day] || [])];
      
      const user1Index = dayRoster.findIndex(a => a.userId === userId1);
      const user2Index = dayRoster.findIndex(a => a.userId === userId2);
      
      let swapDetails = {};
      
      if (user1Index !== -1 && user2Index !== -1) {
        // Both are working - swap shifts
        const user1Shift = dayRoster[user1Index].shift;
        const user2Shift = dayRoster[user2Index].shift;
        
        swapDetails = {
          type: "shift_swap",
          userId1,
          userId2,
          oldShift1: user1Shift,
          oldShift2: user2Shift,
          newShift1: user2Shift,
          newShift2: user1Shift
        };
        
        // Perform swap
        dayRoster[user1Index].shift = user2Shift;
        dayRoster[user2Index].shift = user1Shift;
        
      } else if (user1Index !== -1 && user2Index === -1) {
        // User1 working, User2 off - swap: User2 takes shift, User1 takes off
        const user1Shift = dayRoster[user1Index].shift;
        
        swapDetails = {
          type: "off_swap",
          userIdTakingShift: userId2,
          userIdTakingOff: userId1,
          shift: user1Shift
        };
        
        // Remove user1, add user2
        dayRoster.splice(user1Index, 1);
        dayRoster.push({
          userId: userId2,
          name: await this._getUserName(teamId, userId2),
          shift: user1Shift,
          date: rosterData.roster[day][0]?.date,
          dayName: rosterData.roster[day][0]?.dayName,
          isWeekend: rosterData.roster[day][0]?.isWeekend,
          isSwapped: true,
          swappedFrom: userId1
        });
        
      } else if (user1Index === -1 && user2Index !== -1) {
        // User2 working, User1 off - swap: User1 takes shift, User2 takes off
        const user2Shift = dayRoster[user2Index].shift;
        
        swapDetails = {
          type: "off_swap",
          userIdTakingShift: userId1,
          userIdTakingOff: userId2,
          shift: user2Shift
        };
        
        // Remove user2, add user1
        dayRoster.splice(user2Index, 1);
        dayRoster.push({
          userId: userId1,
          name: await this._getUserName(teamId, userId1),
          shift: user2Shift,
          date: rosterData.roster[day][0]?.date,
          dayName: rosterData.roster[day][0]?.dayName,
          isWeekend: rosterData.roster[day][0]?.isWeekend,
          isSwapped: true,
          swappedFrom: userId2
        });
      }
      
      // Update the roster
      const updatedRoster = { ...rosterData.roster };
      updatedRoster[day] = dayRoster;
      
      // Add swap history
      const swapHistory = rosterData.swapHistory || [];
      swapHistory.push({
        id: Date.now().toString(),
        day,
        date: rosterData.roster[day][0]?.date,
        ...swapDetails,
        swappedBy,
        reason,
        timestamp: new Date()
      });
      
      transaction.update(rosterRef, {
        roster: updatedRoster,
        swapHistory,
        lastModified: new Date(),
        lastModifiedBy: swappedBy
      });
      
      return { swapDetails, swapHistory };
    });
    
    // Update user histories after transaction
    await this._updateSwapHistory(teamId, year, month, result.swapDetails, { roster: result.swapHistory });
    
    console.log(`✅ Shift swap completed successfully`);
    return {
      success: true,
      message: "Shifts swapped successfully",
      swapDetails: result.swapDetails
    };
  }
  
  static async _updateSwapHistory(teamId, year, month, swapDetails, rosterData) {
    const batch = db.batch();
    const date = rosterData.roster?.[0]?.date || new Date().toISOString();
    
    if (swapDetails.type === "shift_swap") {
      // Update both users' histories
      for (const userId of [swapDetails.userId1, swapDetails.userId2]) {
        const historyRef = db
          .collection("teams")
          .doc(teamId)
          .collection("shiftHistory")
          .doc(userId);
        
        batch.update(historyRef, {
          swapHistory: FieldValue.arrayUnion({  // Use FieldValue here
            year,
            month,
            date,
            type: "shift_swap",
            details: swapDetails,
            timestamp: new Date()
          })
        });
      }
    } else if (swapDetails.type === "off_swap") {
      // Update the user who took the shift
      const historyRef = db
        .collection("teams")
        .doc(teamId)
        .collection("shiftHistory")
        .doc(swapDetails.userIdTakingShift);
      
      batch.update(historyRef, {
        swapHistory: FieldValue.arrayUnion({  // Use FieldValue here
          year,
          month,
          date,
          type: "off_swap",
          details: swapDetails,
          timestamp: new Date()
        }),
        totalShiftsByType: {
          [swapDetails.shift]: FieldValue.increment(1)
        }
      });
      
      // Update the user who took off
      const offHistoryRef = db
        .collection("teams")
        .doc(teamId)
        .collection("shiftHistory")
        .doc(swapDetails.userIdTakingOff);
      
      batch.update(offHistoryRef, {
        swapHistory: FieldValue.arrayUnion({  // Use FieldValue here
          year,
          month,
          date,
          type: "off_swap_taken",
          details: swapDetails,
          timestamp: new Date()
        }),
        totalShiftsByType: {
          [swapDetails.shift]: FieldValue.increment(-1)
        }
      });
    }
    
    await batch.commit();
  }
  
  static async getSwapHistory(teamId, year, month) {
    const roster = await this._getRoster(teamId, year, month);
    return {
      success: true,
      swapHistory: roster.swapHistory || [],
      totalSwaps: (roster.swapHistory || []).length
    };
  }
  
  static async revertSwap(teamId, year, month, swapId, revertedBy) {
    const rosterRef = db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .doc(`${year}-${month}`);
    
    const rosterDoc = await rosterRef.get();
    
    if (!rosterDoc.exists) {
      throw new Error(`Roster not found for ${year}-${month}`);
    }
    
    const rosterData = rosterDoc.data();
    const swapHistory = rosterData.swapHistory || [];
    const swapIndex = swapHistory.findIndex(s => s.id === swapId);
    
    if (swapIndex === -1) {
      throw new Error(`Swap ${swapId} not found`);
    }
    
    const swap = swapHistory[swapIndex];
    const dayRoster = [...(rosterData.roster[swap.day] || [])];
    
    // Revert based on swap type
    if (swap.type === "shift_swap") {
      const user1Index = dayRoster.findIndex(a => a.userId === swap.userId1);
      const user2Index = dayRoster.findIndex(a => a.userId === swap.userId2);
      
      if (user1Index !== -1 && user2Index !== -1) {
        const tempShift = dayRoster[user1Index].shift;
        dayRoster[user1Index].shift = dayRoster[user2Index].shift;
        dayRoster[user2Index].shift = tempShift;
      }
    } else if (swap.type === "off_swap") {
      const userWorkingIndex = dayRoster.findIndex(a => a.userId === swap.userIdTakingShift);
      const userOffIndex = dayRoster.findIndex(a => a.userId === swap.userIdTakingOff);
      
      if (userWorkingIndex !== -1) {
        dayRoster.splice(userWorkingIndex, 1);
        const originalUser = await this._getUserDetails(teamId, swap.userIdTakingOff);
        dayRoster.push({
          userId: swap.userIdTakingOff,
          name: originalUser.name,
          shift: swap.shift,
          date: rosterData.roster[swap.day][0]?.date,
          dayName: rosterData.roster[swap.day][0]?.dayName,
          isWeekend: rosterData.roster[swap.day][0]?.isWeekend
        });
      }
    }
    
    const updatedRoster = { ...rosterData.roster };
    updatedRoster[swap.day] = dayRoster;
    
    swapHistory[swapIndex].reverted = true;
    swapHistory[swapIndex].revertedAt = new Date();
    swapHistory[swapIndex].revertedBy = revertedBy;
    
    await rosterRef.update({
      roster: updatedRoster,
      swapHistory,
      lastModified: new Date(),
      lastModifiedBy: revertedBy
    });
    
    return {
      success: true,
      message: "Swap reverted successfully"
    };
  }
  
  static async validateSwap(teamId, year, month, day, userId1, userId2) {
    try {
      const roster = await this._getRoster(teamId, year, month);
      const dayRoster = roster.roster[day];
      
      if (!dayRoster) {
        return { valid: false, issues: [`No roster found for day ${day}`] };
      }
      
      const user1Assignment = dayRoster.find(a => a.userId === userId1);
      const user2Assignment = dayRoster.find(a => a.userId === userId2);
      
      const issues = [];
      
      if (!user1Assignment && !user2Assignment) {
        issues.push(`Neither user is working on day ${day}`);
      }
      
      if (user1Assignment && user2Assignment) {
        if (!this._canSwapShifts(user1Assignment.shift, user2Assignment.shift)) {
          issues.push(`Cannot swap ${user1Assignment.shift} shift with ${user2Assignment.shift} shift`);
        }
      }
      
      return {
        valid: issues.length === 0,
        issues,
        user1: user1Assignment,
        user2: user2Assignment
      };
    } catch (error) {
      return { valid: false, issues: [error.message] };
    }
  }
  
  static _canSwapShifts(shift1, shift2) {
    const compatibleShifts = {
      morning: ["morning", "evening"],
      evening: ["evening", "morning"],
      night: ["night"]
    };
    return compatibleShifts[shift1]?.includes(shift2) || false;
  }
  
  static async _getRoster(teamId, year, month) {
    const rosterRef = db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .doc(`${year}-${month}`);
    
    const rosterDoc = await rosterRef.get();
    
    if (!rosterDoc.exists) {
      throw new Error(`Roster not found for ${year}-${month}`);
    }
    
    return rosterDoc.data();
  }
  
  static async _getAllUsers(teamId) {
    const teamDoc = await db.collection("teams").doc(teamId).get();
    
    if (!teamDoc.exists) {
      throw new Error("Team not found");
    }
    
    const members = teamDoc.data().members || [];
    return members.map(member => ({
      id: member.userId,
      name: member.name,
      email: member.email
    }));
  }
  
  static async _getUserName(teamId, userId) {
    const teamDoc = await db.collection("teams").doc(teamId).get();
    const members = teamDoc.data().members || [];
    const user = members.find(m => m.userId === userId);
    return user?.name || "Unknown User";
  }
  
  static async _getUserDetails(teamId, userId) {
    const teamDoc = await db.collection("teams").doc(teamId).get();
    const members = teamDoc.data().members || [];
    const user = members.find(m => m.userId === userId);
    return user || { name: "Unknown User", userId };
  }
}

module.exports = ShiftSwapService;