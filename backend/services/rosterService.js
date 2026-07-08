// services/rosterService.js

const db = require("../config/firebase");
const admin = require("firebase-admin");
const ShiftSwapService = require("./shiftSwapService");

const FieldValue =
  admin.firestore.FieldValue ||
  require("@google-cloud/firestore").FieldValue;

class RosterService {

  // ==================== HELPERS ====================

  static _getDayOfWeek(year, month, day) {
    return new Date(year, month - 1, day).getDay();
  }

  static _getDayName(dayOfWeek) {
    return [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ][dayOfWeek];
  }

  // ==================== SHIFT CONFIG ====================

  static async _getShiftConfig(teamId) {
    const configDoc = await db
      .collection("teams")
      .doc(teamId)
      .collection("config")
      .doc("shiftConfig")
      .get();

    const defaultShifts = [
      {
        id: "morning_1",
        type: "morning",
        name: "Morning Shift A",
        startTime: "06:00",
        endTime: "14:00",
        color: "#FFD700"
      },
      {
        id: "evening_1",
        type: "evening",
        name: "Evening Shift",
        startTime: "14:00",
        endTime: "22:00",
        color: "#FF8C00"
      },
      {
        id: "night_1",
        type: "night",
        name: "Night Shift",
        startTime: "22:00",
        endTime: "06:00",
        color: "#4B0082"
      }
    ];

    const defaultRequirements = {
      Monday: { morning_1: 3, evening_1: 3, night_1: 2 },
      Tuesday: { morning_1: 3, evening_1: 3, night_1: 2 },
      Wednesday: { morning_1: 3, evening_1: 3, night_1: 2 },
      Thursday: { morning_1: 3, evening_1: 3, night_1: 2 },
      Friday: { morning_1: 3, evening_1: 3, night_1: 2 },
      Saturday: { morning_1: 2, evening_1: 2, night_1: 1 },
      Sunday: { morning_1: 2, evening_1: 2, night_1: 1 }
    };

    if (!configDoc.exists) {
      return {
        shifts: defaultShifts,
        dailyRequirements: defaultRequirements,
        weekendStaffCount: 3,
        rotationEnabled: true
      };
    }

    const config = configDoc.data();

    if (!config.shifts || !Array.isArray(config.shifts)) {
      config.shifts = defaultShifts;
    }

    if (!config.dailyRequirements) {
      config.dailyRequirements = defaultRequirements;
    }

    return config;
  }

 static _getDayRequirements(shiftConfig, date) {
  const dayName = this._getDayName(date.getDay());
  return shiftConfig.dailyRequirements?.[dayName] || {};
}

  // ==================== USERS WITH HISTORY ====================

  static async _getMemberShiftHistory(teamId, memberId) {
  const historyRef = db
    .collection("teams")
    .doc(teamId)
    .collection("shiftHistory")
    .doc(memberId);

  const historyDoc = await historyRef.get();
  
  // Get member settings
  const settingsRef = db
    .collection("teams")
    .doc(teamId)
    .collection("memberSettings")
    .doc(memberId);
  
  const settingsDoc = await settingsRef.get();
  const weeklyOffDays = settingsDoc.exists ? settingsDoc.data().weeklyOffDays || [] : [];
  const assignedShiftId = settingsDoc.exists ? settingsDoc.data().assignedShiftId || null : null;
  
  if (!historyDoc.exists) {
    return { 
      memberId, 
      history: [], 
      currentShift: null, 
      monthsPerShift: {}, 
      totalShiftsByType: {}, 
      weekendAssignments: 0,
      weeklyOffDays: weeklyOffDays,
      assignedShiftId: assignedShiftId
    };
  }

  const data = historyDoc.data();
  const monthsPerShift = {};
  const totalShiftsByType = {};
  
  if (data.history && Array.isArray(data.history)) {
    data.history.forEach(entry => {
      if (entry.shiftId) {
        monthsPerShift[entry.shiftId] = (monthsPerShift[entry.shiftId] || 0) + 1;
        totalShiftsByType[entry.shiftId] = (totalShiftsByType[entry.shiftId] || 0) + (entry.daysWorked || 22);
      }
    });
  }

  return {
    memberId,
    history: data.history || [],
    currentShift: data.currentShift || null,
    monthsPerShift,
    totalShiftsByType,
    weekendAssignments: data.weekendAssignments || 0,
    weeklyOffDays: weeklyOffDays,
    assignedShiftId: assignedShiftId
  };
}

  static async _getUsersWithHistory(teamId) {
  const teamDoc = await db.collection("teams").doc(teamId).get();
  
  if (!teamDoc.exists) throw new Error("Team not found");

  const members = teamDoc.data().members || [];
  
  if (members.length === 0) {
    throw new Error("No team members found. Please add members to the team first.");
  }
  
  const users = [];

  for (const member of members) {
    const memberData = member.memberData || {};
    const history = await this._getMemberShiftHistory(teamId, member.userId);
    
    users.push({
      id: member.userId,
      name: member.name || "Unknown",
      email: member.email || "",
      history: history.history,
      currentShift: history.currentShift,
      totalShiftsByType: history.totalShiftsByType || {},
      monthsPerShift: history.monthsPerShift || {},
      weekendAssignments: history.weekendAssignments || 0,
      weeklyOffDays: history.weeklyOffDays || [],
      assignedShiftId: history.assignedShiftId || null, // Admin assigned shift
      preferences: memberData.preferences || { preferred: [], avoid: [] },
      leaves: memberData.leaves || [],
      isRegistered: member.isRegistered !== false
    });
  }

  return users;
}
// Add to services/rosterService.js
// Add to rosterService.js
// Add to services/rosterService.js

// ==================== MEMBER SHIFT ASSIGNMENT ====================

static async updateMemberShiftAssignment(teamId, memberId, shiftId) {
  try {
    const settingsRef = db
      .collection("teams")
      .doc(teamId)
      .collection("memberSettings")
      .doc(memberId);
    
    await settingsRef.set({
      assignedShiftId: shiftId,
      updatedAt: new Date()
    }, { merge: true });
    
    return {
      success: true,
      message: "Shift assignment updated successfully"
    };
  } catch (error) {
    console.error('Error in updateMemberShiftAssignment:', error);
    return { success: false, error: error.message };
  }
}

static async getMemberShiftAssignment(teamId, memberId) {
  try {
    const settingsRef = db
      .collection("teams")
      .doc(teamId)
      .collection("memberSettings")
      .doc(memberId);
    
    const settingsDoc = await settingsRef.get();
    const assignedShiftId = settingsDoc.exists ? settingsDoc.data().assignedShiftId || null : null;
    
    return {
      success: true,
      assignedShiftId: assignedShiftId
    };
  } catch (error) {
    console.error('Error in getMemberShiftAssignment:', error);
    return { success: false, error: error.message, assignedShiftId: null };
  }
}

static async getShiftFrequencyTable(teamId) {
  try {
    const users = await this._getUsersWithHistory(teamId);
    
    const table = users.map(user => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      shiftCounts: user.totalShiftsByType || {},
      totalShifts: Object.values(user.totalShiftsByType || {}).reduce((a, b) => a + b, 0),
      monthsPerShift: user.monthsPerShift || {},
      weekendAssignments: user.weekendAssignments || 0,
      currentShift: user.currentShift || "Unassigned",
      weeklyOffDays: user.weeklyOffDays || []
    }));
    
    return { 
      success: true, 
      table,
      totalUsers: table.length
    };
  } catch (error) {
    console.error('Error in getShiftFrequencyTable:', error);
    return { 
      success: false, 
      table: [],
      totalUsers: 0,
      error: error.message 
    };
  }
}
// Add these methods to your rosterService.js

// ==================== MEMBER MANAGEMENT ====================

static async getMembers(teamId) {
  try {
    const teamDoc = await db.collection("teams").doc(teamId).get();
    
    if (!teamDoc.exists) {
      throw new Error("Team not found");
    }

    const members = teamDoc.data().members || [];
    const shiftConfig = await this._getShiftConfig(teamId);
    
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const settingsRef = db
          .collection("teams")
          .doc(teamId)
          .collection("memberSettings")
          .doc(member.userId);
        
        const settingsDoc = await settingsRef.get();
        const weeklyOffDays = settingsDoc.exists ? settingsDoc.data().weeklyOffDays || [] : [];
        const assignedShiftId = settingsDoc.exists ? settingsDoc.data().assignedShiftId || null : null;
        
        // Get shift details if assigned
        const assignedShift = assignedShiftId 
          ? shiftConfig.shifts.find(s => s.id === assignedShiftId) 
          : null;
        
        const history = await this._getMemberShiftHistory(teamId, member.userId);
        
        return {
          userId: member.userId,
          name: member.name || "Unknown",
          email: member.email || "",
          weeklyOffDays: weeklyOffDays,
          assignedShiftId: assignedShiftId,
          assignedShiftName: assignedShift?.name || null,
          assignedShiftTimings: assignedShift ? `${assignedShift.startTime} - ${assignedShift.endTime}` : null,
          currentShift: history.currentShift,
          monthsPerShift: history.monthsPerShift,
          totalShiftsByType: history.totalShiftsByType,
          weekendAssignments: history.weekendAssignments
        };
      })
    );
    
    return {
      success: true,
      members: membersWithDetails,
      availableShifts: shiftConfig.shifts
    };
  } catch (error) {
    console.error('Error in getMembers:', error);
    return { success: false, error: error.message, members: [], availableShifts: [] };
  }
}

static async updateMemberWeeklyOff(teamId, memberId, weeklyOffDays) {
  try {
    const settingsRef = db
      .collection("teams")
      .doc(teamId)
      .collection("memberSettings")
      .doc(memberId);
    
    await settingsRef.set({
      weeklyOffDays: weeklyOffDays,
      updatedAt: new Date()
    }, { merge: true });
    
    return {
      success: true,
      message: "Weekly off days updated successfully"
    };
  } catch (error) {
    console.error('Error in updateMemberWeeklyOff:', error);
    return { success: false, error: error.message };
  }
}

// ==================== GET ROSTER STATISTICS ====================

static async getRosterStatistics(teamId) {
  try {
    const users = await this._getUsersWithHistory(teamId);
    
    // Get all rosters for this team
    const rostersSnapshot = await db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .get();
    
    const rosters = [];
    rostersSnapshot.forEach(doc => {
      rosters.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    const statistics = {
      totalMembers: users.length,
      totalRosters: rosters.length,
      currentAssignments: users.map(user => ({
        userId: user.id,
        name: user.name,
        currentShift: user.currentShift || "Not Assigned"
      })),
      shiftHistory: users.reduce((acc, user) => {
        acc[user.id] = {
          name: user.name,
          currentShift: user.currentShift,
          monthsPerShift: user.monthsPerShift,
          totalShiftsByType: user.totalShiftsByType,
          weekendAssignments: user.weekendAssignments
        };
        return acc;
      }, {})
    };
    
    return statistics;
  } catch (error) {
    console.error('Error in getRosterStatistics:', error);
    return {
      totalMembers: 0,
      totalRosters: 0,
      currentAssignments: [],
      shiftHistory: {}
    };
  }
}

// ==================== UPDATE SHIFT REQUIREMENTS ====================

static async updateShiftRequirements(teamId, requirements) {
  try {
    const configRef = db
      .collection("teams")
      .doc(teamId)
      .collection("config")
      .doc("shiftConfig");
    
    await configRef.set({
      dailyRequirements: requirements,
      updatedAt: new Date()
    }, { merge: true });
    
    return { success: true, message: "Shift requirements updated successfully" };
  } catch (error) {
    console.error('Error in updateShiftRequirements:', error);
    return { success: false, error: error.message };
  }
}

// ==================== GET SHIFT REQUIREMENTS ====================

static async getShiftRequirements(teamId) {
  try {
    const configDoc = await db
      .collection("teams")
      .doc(teamId)
      .collection("config")
      .doc("shiftConfig")
      .get();
    
    if (!configDoc.exists) {
      const defaultRequirements = {
        Monday: { morning_1: 3, evening_1: 3, night_1: 2 },
        Tuesday: { morning_1: 3, evening_1: 3, night_1: 2 },
        Wednesday: { morning_1: 3, evening_1: 3, night_1: 2 },
        Thursday: { morning_1: 3, evening_1: 3, night_1: 2 },
        Friday: { morning_1: 3, evening_1: 3, night_1: 2 },
        Saturday: { morning_1: 2, evening_1: 2, night_1: 1 },
        Sunday: { morning_1: 2, evening_1: 2, night_1: 1 }
      };
      return defaultRequirements;
    }
    
    const config = configDoc.data();
    return config.dailyRequirements || {};
  } catch (error) {
    console.error('Error in getShiftRequirements:', error);
    return {};
  }
}

// ==================== GET MEMBER ROSTER ====================

static async getMemberRoster(teamId, memberId, year, month) {
  try {
    const rosterDoc = await db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .doc(`${year}-${month}`)
      .get();
    
    if (!rosterDoc.exists) {
      throw new Error("Roster not found");
    }
    
    const rosterData = rosterDoc.data();
    const userSchedule = rosterData.userSchedules?.find(s => s.userId === memberId);
    
    if (!userSchedule) {
      throw new Error("Member not found in this roster");
    }
    
    return {
      success: true,
      member: {
        name: userSchedule.name,
        assignedShift: userSchedule.assignedShift,
        schedule: userSchedule.schedule,
        shiftCounts: userSchedule.shiftCounts,
        totalDaysWorked: userSchedule.totalDaysWorked
      }
    };
  } catch (error) {
    console.error('Error in getMemberRoster:', error);
    throw error;
  }
}

// Replace your existing generateRoster method with this complete version

static async generateRoster(teamId, year, month, rosterStartDate=null,rosterEndDate=null,shouldSave = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 GENERATING ROSTER for ${month}/${year}`);
  console.log(`${'='.repeat(60)}\n`);

  const shiftConfig = await this._getShiftConfig(teamId);
  const users = await this._getUsersWithHistory(teamId);
  const startDate = rosterStartDate
  ? new Date(rosterStartDate)
  : new Date(year, month - 1, 1);

const endDate = rosterEndDate
  ? new Date(rosterEndDate)
  : new Date(year, month, 0);
console.log("Roster Start Date (raw):", rosterStartDate);
console.log("Roster End Date (raw):", rosterEndDate);

console.log("Parsed Start:", startDate);
console.log("Parsed End:", endDate);

console.log("ISO Start:", startDate.toISOString());
console.log("ISO End:", endDate.toISOString());

// Validation
// Validation
if (startDate > endDate) {
  throw new Error("Roster start date must be before end date.");
}

const totalDays =
  Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const rosterDates = [];

for (
  let current = new Date(startDate);
  current <= endDate;
  current.setDate(current.getDate() + 1)
) {
  rosterDates.push(new Date(current));
}

  if (!users.length) {
    throw new Error("No users found");
  }

  console.log(`📋 Total Users: ${users.length}`);
  console.log(`📋 Total Shifts: ${shiftConfig.shifts.length}`);

  // ==================== CREATE SHIFT BUCKETS ====================
  const shiftAssignments = {};
  shiftConfig.shifts.forEach(shift => {
    shiftAssignments[shift.id] = [];
  });

  // ==================== CALCULATE PEOPLE NEEDED PER SHIFT ====================
  const peopleNeededPerShift = {};

  for (const shift of shiftConfig.shifts) {
    let maxRequirement = 0;
    for (const currentDate of rosterDates) {
      
      const d = currentDate.getDate();

      const currentYear = currentDate.getFullYear();

      const currentMonth = currentDate.getMonth() + 1;

      const dayOfWeek = currentDate.getDay();

      const dayName = this._getDayName(dayOfWeek);

      const dateStr = currentDate.toISOString().split("T")[0];
      const requirements = this._getDayRequirements(
    shiftConfig,
    currentDate
);
      const req = requirements[shift.id] || 0;
      if (req > maxRequirement) {
        maxRequirement = req;
      }
    }
    peopleNeededPerShift[shift.id] = maxRequirement;
    console.log(`   ${shift.name}: Need ${maxRequirement} people`);
  }

  // ==================== DISTRIBUTE USERS TO SHIFTS ====================
  const remainingUsers = [...users];

  for (const shift of shiftConfig.shifts) {
    const needed = peopleNeededPerShift[shift.id];
    
    for (let i = 0; i < needed && remainingUsers.length > 0; i++) {
      const user = remainingUsers.shift();
      user.assignedShift = shift.id;
      user.shiftType = shift.type || shift.id;
      user.daysWorkedThisMonth = 0;
      user.weeklyDaysWorked = 0;
      shiftAssignments[shift.id].push(user);
      console.log(`   👤 ${user.name} assigned to ${shift.name}`);
    }
  }

  // Assign any remaining users to the smallest shift
  for (const user of remainingUsers) {
    const smallestShift = shiftConfig.shifts.reduce((min, curr) => {
      return shiftAssignments[curr.id].length < shiftAssignments[min.id].length ? curr : min;
    });
    user.assignedShift = smallestShift.id;
    user.shiftType = smallestShift.type || smallestShift.id;
    user.daysWorkedThisMonth = 0;
    user.weeklyDaysWorked = 0;
    shiftAssignments[smallestShift.id].push(user);
    console.log(`   👤 ${user.name} assigned to ${smallestShift.name} (extra)`);
  }

  // ==================== DAILY ROSTER GENERATION ====================
  const roster = {};
  const allUsers = users;

  for (const currentDate of rosterDates) {

    const d = currentDate.getDate();

    const currentYear = currentDate.getFullYear();

    const currentMonth = currentDate.getMonth() + 1;

    const dayOfWeek = currentDate.getDay();

    const dayName = this._getDayName(dayOfWeek);

    const dateStr = currentDate.toISOString().split("T")[0];
    
   
    // Reset weekly counters on Monday
    if (dayName === "Monday") {
      allUsers.forEach(user => {
        user.weeklyDaysWorked = 0;
      });
    }

    const requirements = this._getDayRequirements(shiftConfig, currentDate);
    console.log("\n==============================");
console.log("Date:", dateStr);
console.log("Day:", dayName);
console.log("Requirements:", requirements);
    const todayAssignments = [];

    for (const shift of shiftConfig.shifts) {
      const requiredCount = requirements[shift.id] || 0;
      if (requiredCount === 0) continue;

      const shiftUsers = shiftAssignments[shift.id] || [];

      // Get eligible users (not on leave, not at weekly/monthly limit, not on weekly off)
      let eligibleUsers = shiftUsers.filter(user => {
        if (user.leaves && user.leaves.includes(dateStr)) return false;
        if (user.weeklyDaysWorked >= 5) return false;
        if (user.daysWorkedThisMonth >= 26) return false;
        
        // Check weekly off days
        if (user.weeklyOffDays && user.weeklyOffDays.includes(dayName)) return false;
        
        return true;
      });

      // Sort by days worked (least first) for fairness
      eligibleUsers.sort((a, b) => a.weeklyDaysWorked - b.weeklyDaysWorked);

      const assignedCount = Math.min(requiredCount, eligibleUsers.length);

      if (assignedCount < requiredCount) {
        console.warn(`⚠️ Day ${d} (${dayName}): Only ${assignedCount}/${requiredCount} ${shift.name} workers available`);
      }

      for (let i = 0; i < assignedCount; i++) {
        const user = eligibleUsers[i];

        todayAssignments.push({
          userId: user.id,
          name: user.name,
          shift: shift.id,
          shiftName: shift.name,
          shiftType: shift.type || shift.id,
          date: dateStr,
          dayName: dayName,
          color: shift.color
        });

        user.weeklyDaysWorked++;
        user.daysWorkedThisMonth++;
      }
    }

    roster[dateStr] = todayAssignments;
  }

  // ==================== BUILD USER SCHEDULES ====================
  const userSchedules = allUsers.map(user => {
    const schedule = {};
    const shiftCounts = {};
    let totalDaysWorked = 0;

    for (const currentDate of rosterDates) {
  const dateStr = currentDate.toISOString().split("T")[0];

  const assignments = roster[dateStr] || [];
  const assignment = assignments.find(a => a.userId === user.id);

  if (assignment) {
    schedule[dateStr] = assignment.shift;
    shiftCounts[assignment.shift] =
      (shiftCounts[assignment.shift] || 0) + 1;
    totalDaysWorked++;
  } else {
    schedule[dateStr] = "OFF";
  }
}

    return {
      userId: user.id,
      name: user.name,
      assignedShift: user.assignedShift,
      shiftType: user.shiftType,
      weeklyOffDays: user.weeklyOffDays || [],
      schedule,
      shiftCounts,
      totalDaysWorked
    };
  });

  // ==================== RESULT ====================
  const result = {
    roster,
    userSchedules,
    shiftConfig,
    summary: {
      totalUsers: allUsers.length,
      totalShifts: shiftConfig.shifts.length,
      shiftBreakdown: Object.fromEntries(
        shiftConfig.shifts.map(shift => [shift.id, shiftAssignments[shift.id].length])
      ),
      averageDaysPerUser: Math.round(
        userSchedules.reduce((sum, u) => sum + u.totalDaysWorked, 0) / userSchedules.length
      )
    },
    metadata: {
      teamId,
      year,
      month,
      generatedAt: new Date()
    }
  };

  console.log(`\n✅ ROSTER GENERATION COMPLETE`);
  console.log(`   Total Users: ${result.summary.totalUsers}`);
  console.log(`   Shift Breakdown:`, result.summary.shiftBreakdown);

  // ==================== SAVE ====================
  if (shouldSave) {
    const rosterRef = db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .doc(`${year}-${month}`);

    await rosterRef.set({
    ...result,

    year,
    month,

    rosterStartDate:
        rosterStartDate ??
        startDate.toISOString().split("T")[0],

    rosterEndDate:
        rosterEndDate ??
        endDate.toISOString().split("T")[0],

    createdAt: new Date(),
    updatedAt: new Date(),
    published: true
});

    const batch = db.batch();

    for (const schedule of userSchedules) {
      const historyRef = db
        .collection("teams")
        .doc(teamId)
        .collection("shiftHistory")
        .doc(schedule.userId);

      const historyUpdate = {
        currentShift: schedule.assignedShift,
        history: FieldValue.arrayUnion({
          year,
          month,
          shiftId: schedule.assignedShift,
          shiftType: schedule.shiftType,
          daysWorked: schedule.totalDaysWorked,
          timestamp: new Date()
        })
      };

      batch.set(historyRef, historyUpdate, { merge: true });
    }

    await batch.commit();
    console.log(`💾 Roster saved successfully!`);
  }

  return result;
}
  // ==================== PUBLIC METHODS ====================

  static async generateRosterPreview(teamId, year, month,rosterStartDate=null,rosterEndDate=null) {
    return await this.generateRoster(teamId, year, month,  rosterStartDate, rosterEndDate, false);
  }

  static async confirmAndSaveRoster(teamId, year, month, confirmationToken,rosterStartDate=null,rosterEndDate=null) {
    if (confirmationToken !== "CONFIRM") {
      throw new Error("Invalid confirmation token");
    }
    return await this.generateRoster(teamId, year, month,  rosterStartDate, rosterEndDate, true);
  }

  static async getRoster(teamId, year, month) {
  console.log("Loading roster:", teamId, year, month);
  console.log("Doc ID:", `${year}-${month}`);

  const doc = await db
    .collection("teams")
    .doc(teamId)
    .collection("rosters")
    .doc(`${year}-${month}`)
    .get();

  console.log("Exists:", doc.exists);

  if (!doc.exists) {
    throw new Error("Roster not found");
  }

  return doc.data();
}

  static async deleteRoster(teamId, year, month) {
    await db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .doc(`${year}-${month}`)
      .delete();

    return { success: true };
  }

  static async updateShiftConfig(teamId, config) {
    await db
      .collection("teams")
      .doc(teamId)
      .collection("config")
      .doc("shiftConfig")
      .set({
        ...config,
        updatedAt: new Date()
      }, { merge: true });

    return { success: true };
  }

  static async getShiftConfig(teamId) {
    return await this._getShiftConfig(teamId);
  }

  static async getAvailableSwapUsers(teamId, year, month, day, userId) {
    return await ShiftSwapService.getAvailableSwapUsers(teamId, year, month, day, userId);
  }

  static async swapShifts(teamId, year, month, day, userId1, userId2, swappedBy, reason = "") {
    return await ShiftSwapService.swapShifts(teamId, year, month, day, userId1, userId2, swappedBy, reason);
  }

  static async getSwapHistory(teamId, year, month) {
    return await ShiftSwapService.getSwapHistory(teamId, year, month);
  }

  static async revertSwap(teamId, year, month, swapId, revertedBy) {
    return await ShiftSwapService.revertSwap(teamId, year, month, swapId, revertedBy);
  }
}

module.exports = RosterService;