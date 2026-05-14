// services/rosterService.js
const db = require("../config/firebase");
const admin = require('firebase-admin');
const ShiftSwapService = require("./shiftSwapService"); 
const FieldValue = admin.firestore.FieldValue || require('@google-cloud/firestore').FieldValue;
class RosterService {

  // ==================== HUNGARIAN ALGORITHM (Optimized) ====================
  static _hungarian(costMatrix) {
    const n = costMatrix.length;
    const m = costMatrix[0].length;
    
    if (n > 50 || m > 50) {
      return this._greedyAssignment(costMatrix);
    }
    
    const u = Array(n + 1).fill(0);
    const v = Array(m + 1).fill(0);
    const p = Array(m + 1).fill(0);
    const way = Array(m + 1).fill(0);

    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = Array(m + 1).fill(Infinity);
      const used = Array(m + 1).fill(false);

      do {
        used[j0] = true;
        let i0 = p[j0];
        let delta = Infinity;
        let j1 = 0;

        for (let j = 1; j <= m; j++) {
          if (!used[j]) {
            const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
            if (cur < minv[j]) {
              minv[j] = cur;
              way[j] = j0;
            }
            if (minv[j] < delta) {
              delta = minv[j];
              j1 = j;
            }
          }
        }

        for (let j = 0; j <= m; j++) {
          if (used[j]) {
            u[p[j]] += delta;
            v[j] -= delta;
          } else {
            minv[j] -= delta;
          }
        }
        j0 = j1;
      } while (p[j0] !== 0);

      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }

    const assignment = Array(n);
    for (let j = 1; j <= m; j++) {
      if (p[j] !== 0) {
        assignment[p[j] - 1] = j - 1;
      }
    }
    return assignment;
  }

  static _greedyAssignment(costMatrix) {
    const n = costMatrix.length;
    const m = costMatrix[0].length;
    const assignment = Array(n).fill(-1);
    const usedCols = new Set();
    
    for (let i = 0; i < n; i++) {
      let bestCol = -1;
      let bestCost = Infinity;
      for (let j = 0; j < m; j++) {
        if (!usedCols.has(j) && costMatrix[i][j] < bestCost) {
          bestCost = costMatrix[i][j];
          bestCol = j;
        }
      }
      if (bestCol !== -1) {
        assignment[i] = bestCol;
        usedCols.add(bestCol);
      }
    }
    return assignment;
  }

  // ==================== DAY OF WEEK HELPERS ====================
  static _getDayOfWeek(year, month, day) {
    return new Date(year, month - 1, day).getDay();
  }

  static _getDayName(dayOfWeek) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek];
  }

  // ==================== GET SHIFT CONFIGURATION ====================
  static async _getShiftConfig(teamId) {
    const configDoc = await db
      .collection("teams")
      .doc(teamId)
      .collection("config")
      .doc("shiftConfig")
      .get();

    const defaultRequirements = {
      Sunday: { morning: 2, evening: 2, night: 1 },
      Monday: { morning: 3, evening: 3, night: 2 },
      Tuesday: { morning: 3, evening: 3, night: 2 },
      Wednesday: { morning: 3, evening: 3, night: 2 },
      Thursday: { morning: 3, evening: 3, night: 2 },
      Friday: { morning: 3, evening: 3, night: 2 },
      Saturday: { morning: 2, evening: 2, night: 1 }
    };

    if (!configDoc.exists) {
      return {
        shifts: [
          { id: "morning", name: "Morning", startTime: "06:00", endTime: "14:00", color: "#FFD700" },
          { id: "evening", name: "Evening", startTime: "14:00", endTime: "22:00", color: "#FF8C00" },
          { id: "night", name: "Night", startTime: "22:00", endTime: "06:00", color: "#4B0082" }
        ],
        dailyRequirements: defaultRequirements,
        weekendStaffCount: 3,
        maxConsecutiveMonths: { morning: 3, evening: 3, night: 2 },
        rotationEnabled: true
      };
    }

    const config = configDoc.data();
    
    if (!config.dailyRequirements) config.dailyRequirements = {};
    if (!config.weekendStaffCount) config.weekendStaffCount = 3;
    if (!config.shifts) config.shifts = [
      { id: "morning", name: "Morning", startTime: "06:00", endTime: "14:00", color: "#FFD700" },
      { id: "evening", name: "Evening", startTime: "14:00", endTime: "22:00", color: "#FF8C00" },
      { id: "night", name: "Night", startTime: "22:00", endTime: "06:00", color: "#4B0082" }
    ];
    
    for (const [day, requirements] of Object.entries(defaultRequirements)) {
      if (!config.dailyRequirements[day]) {
        config.dailyRequirements[day] = requirements;
      }
    }
    
    return config;
  }

  static _getDayRequirements(shiftConfig, year, month, day) {
    const dayOfWeek = this._getDayOfWeek(year, month, day);
    const dayName = this._getDayName(dayOfWeek);
    return shiftConfig.dailyRequirements[dayName] || { morning: 3, evening: 3, night: 2 };
  }

  // ==================== GET MEMBER SHIFT HISTORY ====================
  static async _getMemberShiftHistory(teamId, memberId) {
    const historyRef = db
      .collection("teams")
      .doc(teamId)
      .collection("shiftHistory")
      .doc(memberId);

    const historyDoc = await historyRef.get();
    
    if (!historyDoc.exists) {
      return { 
        memberId, 
        history: [], 
        currentShift: null, 
        monthsPerShift: {}, 
        totalShiftsByType: {}, 
        weekendAssignments: 0 
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
      weekendAssignments: data.weekendAssignments || 0
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
        preferences: memberData.preferences || { preferred: [], avoid: [] },
        leaves: memberData.leaves || [],
        isRegistered: member.isRegistered !== false
      });
    }

    return users;
  }

  // ==================== CORE ROSTER GENERATION (FIXED FOR WEEKEND PATTERN) ====================
  static async generateRoster(teamId, year, month, shouldSave = false) {
    console.log(`🚀 Generating roster for ${year}-${String(month).padStart(2, '0')}`);

    const shiftConfig = await this._getShiftConfig(teamId);
    const users = await this._getUsersWithHistory(teamId);

    if (!users.length) throw new Error("No users found");

    const daysInMonth = new Date(year, month, 0).getDate();
    
    // weekendStaffCount means: number of people per shift that work on weekends
    // For example: weekendStaffCount = 3 means 1 morning + 1 evening + 1 night weekend worker
    const weekendStaffCount = shiftConfig.weekendStaffCount || 3;

    // ========== STEP 1: Calculate required people per shift ==========
    const maxRequired = { morning: 0, evening: 0, night: 0 };
    
    for (let d = 1; d <= daysInMonth; d++) {
      const requirements = this._getDayRequirements(shiftConfig, year, month, d);
      maxRequired.morning = Math.max(maxRequired.morning, requirements.morning || 0);
      maxRequired.evening = Math.max(maxRequired.evening, requirements.evening || 0);
      maxRequired.night = Math.max(maxRequired.night, requirements.night || 0);
    }
    
    console.log(`📊 Max required per shift: Morning=${maxRequired.morning}, Evening=${maxRequired.evening}, Night=${maxRequired.night}`);

    // ========== STEP 2: Assign primary shift to each user ==========
    const shiftAssignments = {
      morning: [],
      evening: [],
      night: []
    };
    
    // Calculate target distribution (weekend workers = 1 per shift, rest are weekday workers)
    const weekendWorkersNeededPerShift = {
      morning: 1,
      evening: 1,
      night: 1
    };
    
    const weekdayWorkersNeededPerShift = {
      morning: maxRequired.morning - 1, // Subtract the weekend worker
      evening: maxRequired.evening - 1,
      night: maxRequired.night - 1
    };
    
    // Ensure we don't go negative
    for (const shift of ['morning', 'evening', 'night']) {
      weekdayWorkersNeededPerShift[shift] = Math.max(0, weekdayWorkersNeededPerShift[shift]);
    }
    
    const totalNeeded = 
      weekendWorkersNeededPerShift.morning + weekendWorkersNeededPerShift.evening + weekendWorkersNeededPerShift.night +
      weekdayWorkersNeededPerShift.morning + weekdayWorkersNeededPerShift.evening + weekdayWorkersNeededPerShift.night;
    
    if (users.length < totalNeeded) {
      console.warn(`⚠️ Not enough users! Need ${totalNeeded}, have ${users.length}`);
    }
    
    console.log(`📋 Staffing needs:`);
    console.log(`   Weekend workers (1 per shift): Morning=1, Evening=1, Night=1`);
    console.log(`   Weekday workers: Morning=${weekdayWorkersNeededPerShift.morning}, Evening=${weekdayWorkersNeededPerShift.evening}, Night=${weekdayWorkersNeededPerShift.night}`);
    
    // Separate users by their weekend assignment history (prioritize those with fewer weekends)
    const sortedByWeekendHistory = [...users].sort((a, b) => 
      (a.weekendAssignments || 0) - (b.weekendAssignments || 0)
    );
    
    // First, assign weekend workers (1 per shift)
    const weekendWorkerIds = new Set();
    
    for (const shift of ['morning', 'evening', 'night']) {
      // Find available users for this shift who haven't been assigned yet
      let assigned = false;
      
      for (const user of sortedByWeekendHistory) {
        if (!weekendWorkerIds.has(user.id) && !user.assignedShift) {
          // Check if this shift is suitable for weekend work
          // Weekend workers get Thu+Fri off, so this shift must NOT be critically needed on Thu/Fri
          const isShiftNeededOnThuFri = this._isShiftNeededOnThuFri(shiftConfig, shift);
          
          if (!isShiftNeededOnThuFri) {
            user.assignedShift = shift;
            user.isWeekendWorker = true;
            user.offDays = ["Thursday", "Friday"];
            weekendWorkerIds.add(user.id);
            shiftAssignments[shift].push(user);
            assigned = true;
            console.log(`   👤 ${user.name} assigned as ${shift} WEEKEND worker (off: Thu+Fri)`);
            break;
          }
        }
      }
      
      // If no suitable user found, assign anyone
      if (!assigned) {
        for (const user of sortedByWeekendHistory) {
          if (!weekendWorkerIds.has(user.id) && !user.assignedShift) {
            user.assignedShift = shift;
            user.isWeekendWorker = true;
            user.offDays = ["Thursday", "Friday"];
            weekendWorkerIds.add(user.id);
            shiftAssignments[shift].push(user);
            console.log(`   👤 ${user.name} assigned as ${shift} WEEKEND worker (off: Thu+Fri) - suboptimal but needed`);
            break;
          }
        }
      }
    }
    
    // Now assign weekday workers for remaining slots
    const remainingUsers = users.filter(u => !u.assignedShift);
    
    for (const shift of ['morning', 'evening', 'night']) {
      const needed = weekdayWorkersNeededPerShift[shift];
      let assigned = 0;
      
      for (const user of remainingUsers) {
        if (assigned >= needed) break;
        if (user.assignedShift) continue;
        
        // Check if this user would be good for this shift based on history
        const historicalShifts = user.totalShiftsByType[shift] || 0;
        const historicalMonths = user.monthsPerShift[shift] || 0;
        
        // Preference check
        let isPreferred = true;
        if (user.preferences.avoid?.includes(shift)) isPreferred = false;
        
        if (isPreferred || historicalShifts < 5) {
          user.assignedShift = shift;
          user.isWeekendWorker = false;
          user.offDays = ["Saturday", "Sunday"];
          shiftAssignments[shift].push(user);
          assigned++;
          console.log(`   👤 ${user.name} assigned as ${shift} WEEKDAY worker (off: Sat+Sun)`);
        }
      }
      
      // If still need more, assign anyone
      for (const user of remainingUsers) {
        if (assigned >= needed) break;
        if (user.assignedShift) continue;
        
        user.assignedShift = shift;
        user.isWeekendWorker = false;
        user.offDays = ["Saturday", "Sunday"];
        shiftAssignments[shift].push(user);
        assigned++;
        console.log(`   👤 ${user.name} assigned as ${shift} WEEKDAY worker (off: Sat+Sun) - fallback`);
      }
    }
    
    // Assign any remaining users to shifts that need more people
    for (const user of users.filter(u => !u.assignedShift)) {
      const smallestShift = ['morning', 'evening', 'night'].reduce((min, shift) => {
        return shiftAssignments[shift].length < shiftAssignments[min].length ? shift : min;
      }, 'morning');
      
      user.assignedShift = smallestShift;
      user.isWeekendWorker = false;
      user.offDays = ["Saturday", "Sunday"];
      shiftAssignments[smallestShift].push(user);
      console.log(`   👤 ${user.name} assigned as ${smallestShift} WEEKDAY worker (extra)`);
    }
    
    console.log(`\n📊 Final assignments:`);
    console.log(`   Morning: ${shiftAssignments.morning.length} (${shiftAssignments.morning.filter(u => u.isWeekendWorker).length} weekend, ${shiftAssignments.morning.filter(u => !u.isWeekendWorker).length} weekday)`);
    console.log(`   Evening: ${shiftAssignments.evening.length} (${shiftAssignments.evening.filter(u => u.isWeekendWorker).length} weekend, ${shiftAssignments.evening.filter(u => !u.isWeekendWorker).length} weekday)`);
    console.log(`   Night: ${shiftAssignments.night.length} (${shiftAssignments.night.filter(u => u.isWeekendWorker).length} weekend, ${shiftAssignments.night.filter(u => !u.isWeekendWorker).length} weekday)`);
    
    // Initialize tracking variables
    users.forEach(user => {
      user.weeklyDaysWorked = 0;
      user.daysWorkedThisMonth = 0;
    });

    // ========== STEP 3: Generate daily roster ==========
    const roster = {};
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = this._getDayOfWeek(year, month, d);
      const dayName = this._getDayName(dayOfWeek);
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      // Reset weekly counters on Monday
      if (dayName === "Monday") {
        users.forEach(user => {
          user.weeklyDaysWorked = 0;
        });
      }
      
      const requirements = this._getDayRequirements(shiftConfig, year, month, d);
      const todayAssignments = [];
      
      for (const shiftType of ['morning', 'evening', 'night']) {
        let requiredCount = requirements[shiftType] || 0;
        
        if (requiredCount === 0) continue;
        
        // Get users for this shift type
        const shiftUsers = shiftAssignments[shiftType];
        
        // Separate weekend and weekday workers
        const weekendWorkers = shiftUsers.filter(u => u.isWeekendWorker);
        const weekdayWorkers = shiftUsers.filter(u => !u.isWeekendWorker);
        
        let eligibleUsers = [];
        
        // On weekends (Sat/Sun), prioritize weekend workers
        if (isWeekend) {
          // Weekend workers should work on Sat/Sun
          eligibleUsers = weekendWorkers.filter(user => {
            if (user.leaves && user.leaves.includes(dateStr)) return false;
            if ((user.weeklyDaysWorked || 0) >= 5) return false;
            if (user.daysWorkedThisMonth >= 22) return false;
            return true;
          });
          
          // If not enough weekend workers, use weekday workers (but they have Sat/Sun off normally)
          if (eligibleUsers.length < requiredCount) {
            const weekdayAvailable = weekdayWorkers.filter(user => {
              if (user.leaves && user.leaves.includes(dateStr)) return false;
              if ((user.weeklyDaysWorked || 0) >= 5) return false;
              if (user.daysWorkedThisMonth >= 22) return false;
              return true;
            });
            eligibleUsers.push(...weekdayAvailable);
          }
        } 
        // On weekdays (Mon-Fri)
        else {
          // Weekday workers should work Mon-Fri
          eligibleUsers = weekdayWorkers.filter(user => {
            if (user.leaves && user.leaves.includes(dateStr)) return false;
            if ((user.weeklyDaysWorked || 0) >= 5) return false;
            if (user.daysWorkedThisMonth >= 22) return false;
            return true;
          });
          
          // Also include weekend workers on their working days (Mon-Wed, since Thu/Fri are off)
          const weekendWorkingDays = weekendWorkers.filter(user => {
            // Weekend workers are off on Thu/Fri, work on Mon/Tue/Wed
            if (dayName === "Thursday" || dayName === "Friday") return false;
            if (user.leaves && user.leaves.includes(dateStr)) return false;
            if ((user.weeklyDaysWorked || 0) >= 5) return false;
            if (user.daysWorkedThisMonth >= 22) return false;
            return true;
          });
          eligibleUsers.push(...weekendWorkingDays);
        }
        
        // Sort by days worked this week (least first)
        eligibleUsers.sort((a, b) => 
          (a.weeklyDaysWorked || 0) - (b.weeklyDaysWorked || 0)
        );
        
        const assignedCount = Math.min(requiredCount, eligibleUsers.length);
        
        if (assignedCount < requiredCount) {
          console.warn(`⚠️ Day ${d} (${dayName}): Only ${assignedCount}/${requiredCount} ${shiftType} workers available`);
        }
        
        for (let i = 0; i < assignedCount; i++) {
          const user = eligibleUsers[i];
          
          todayAssignments.push({
            userId: user.id,
            name: user.name,
            shift: shiftType
          });
          
          user.weeklyDaysWorked = (user.weeklyDaysWorked || 0) + 1;
          user.daysWorkedThisMonth = (user.daysWorkedThisMonth || 0) + 1;
        }
      }
      
      roster[d] = todayAssignments.map(a => ({
        userId: a.userId,
        name: a.name,
        shift: a.shift,
        date: dateStr,
        dayName: dayName,
        isWeekend
      }));
    }

    // ========== STEP 4: Build user schedules ==========
    const userSchedules = users.map(user => {
      const schedule = {};
      const shiftCounts = {};
      let totalDaysWorked = 0;
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dayAssignments = roster[d] || [];
        const userAssignment = dayAssignments.find(a => a.userId === user.id);
        
        if (userAssignment) {
          schedule[d] = userAssignment.shift;
          shiftCounts[userAssignment.shift] = (shiftCounts[userAssignment.shift] || 0) + 1;
          totalDaysWorked++;
        } else {
          schedule[d] = "OFF";
        }
      }
      
      return {
        userId: user.id,
        name: user.name,
        assignedShift: user.assignedShift,
        isWeekendWorker: user.isWeekendWorker,
        offDays: user.offDays,
        schedule,
        shiftCounts,
        totalDaysWorked,
        expectedDays: user.isWeekendWorker ? 22 : 22
      };
    });

    // ========== STEP 5: Calculate summary statistics ==========
    const result = {
      roster,
      userSchedules,
      shiftConfig,
      summary: {
        totalUsers: users.length,
        weekendWorkers: users.filter(u => u.isWeekendWorker).length,
        weekdayWorkers: users.filter(u => !u.isWeekendWorker).length,
        shiftBreakdown: {
          morning: shiftAssignments.morning.length,
          evening: shiftAssignments.evening.length,
          night: shiftAssignments.night.length
        },
        weekendBreakdown: {
          morning: shiftAssignments.morning.filter(u => u.isWeekendWorker).length,
          evening: shiftAssignments.evening.filter(u => u.isWeekendWorker).length,
          night: shiftAssignments.night.filter(u => u.isWeekendWorker).length
        },
        averageDaysPerUser: Math.round(
          userSchedules.reduce((sum, u) => sum + u.totalDaysWorked, 0) / userSchedules.length
        )
      },
      metadata: {
        teamId,
        year,
        month,
        daysInMonth,
        weekendStaffCount,
        generatedAt: new Date(),
        algorithm: "Fixed Pattern: Weekend workers (Thu+Fri off), Weekday workers (Sat+Sun off)"
      }
    };

    // ========== STEP 6: Save to database if requested ==========
    if (shouldSave) {
      const rosterRef = db
        .collection("teams")
        .doc(teamId)
        .collection("rosters")
        .doc(`${year}-${month}`);

      await rosterRef.set({
        ...result,
        createdAt: new Date(),
        updatedAt: new Date(),
        published: true
      });
      
      const batch = db.batch();
      
      for (const userSchedule of userSchedules) {
        const historyRef = db
          .collection("teams")
          .doc(teamId)
          .collection("shiftHistory")
          .doc(userSchedule.userId);
        
        const historyUpdate = {
          currentShift: userSchedule.assignedShift,
          weekendAssignments: (users.find(u => u.id === userSchedule.userId)?.weekendAssignments || 0) + 
                            (userSchedule.isWeekendWorker ? 1 : 0),
          history: FieldValue.arrayUnion({
            year,
            month,
            shiftId: userSchedule.assignedShift,
            daysWorked: userSchedule.totalDaysWorked,
            isWeekendWorker: userSchedule.isWeekendWorker,
            offDays: userSchedule.offDays,
            timestamp: new Date()
          })
        };
        
        batch.set(historyRef, historyUpdate, { merge: true });
      }
      
      await batch.commit();
      
      console.log(`💾 Roster saved and history updated`);
    }

    console.log(`\n✅ Roster generated successfully!`);
    console.log(`   Weekend workers: ${result.summary.weekendWorkers} (1 per shift: Morning, Evening, Night)`);
    console.log(`   Weekday workers: ${result.summary.weekdayWorkers}`);
    console.log(`   Average days/user: ${result.summary.averageDaysPerUser}`);
    
    return result;
  }

  // Helper function to check if a shift is critically needed on Thursday/Friday
  static _isShiftNeededOnThuFri(shiftConfig, shift) {
    // Check requirements for Thursday and Friday
    const thursdayReq = shiftConfig.dailyRequirements["Thursday"] || {};
    const fridayReq = shiftConfig.dailyRequirements["Friday"] || {};
    
    const thursdayNeed = thursdayReq[shift] || 0;
    const fridayNeed = fridayReq[shift] || 0;
    
    // If either day needs this shift, it's not ideal for weekend workers (who are off Thu/Fri)
    return thursdayNeed > 0 || fridayNeed > 0;
  }

  // ==================== PUBLIC METHODS ====================
  
  static async generateRosterPreview(teamId, year, month) {
    return await this.generateRoster(teamId, year, month, false);
  }
  static async getAvailableSwapUsers(teamId, year, month, day, userId) {
    return await ShiftSwapService.getAvailableSwapUsers(teamId, year, month, day, userId);
  }
  
  /**
   * Swap shifts between two users
   */
  static async swapShifts(teamId, year, month, day, userId1, userId2, swappedBy, reason = "") {
    return await ShiftSwapService.swapShifts(teamId, year, month, day, userId1, userId2, swappedBy, reason);
  }
  
  /**
   * Get swap history
   */
  static async getSwapHistory(teamId, year, month) {
    return await ShiftSwapService.getSwapHistory(teamId, year, month);
  }
  
  /**
   * Revert a swap
   */
  static async revertSwap(teamId, year, month, swapId, revertedBy) {
    return await ShiftSwapService.revertSwap(teamId, year, month, swapId, revertedBy);
  }
  
  /**
   * Validate a swap before executing
   */
  static async validateSwap(teamId, year, month, day, userId1, userId2) {
    return await ShiftSwapService.validateSwap(teamId, year, month, day, userId1, userId2);
  }

  // services/rosterService.js - Find the confirmAndSaveRoster method
static async confirmAndSaveRoster(teamId, year, month, confirmationToken) {
  if (confirmationToken !== "CONFIRM") {
    throw new Error("Invalid confirmation token. Use 'CONFIRM' to proceed.");
  }
  
  console.log("📝 Starting confirmAndSaveRoster...");
  console.log(`Team: ${teamId}, Year: ${year}, Month: ${month}`);
  
  try {
    const result = await this.generateRoster(teamId, year, month, true);
    console.log("✅ Roster generated and saved successfully");
    return result;
  } catch (error) {
    console.error("❌ Error in confirmAndSaveRoster:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

  static async updateShiftConfig(teamId, config) {
    if (!config.dailyRequirements) {
      throw new Error("dailyRequirements is required");
    }
    
    await db
      .collection("teams")
      .doc(teamId)
      .collection("config")
      .doc("shiftConfig")
      .set({ 
        ...config, 
        updatedAt: new Date() 
      }, { merge: true });
      
    return { 
      success: true, 
      message: "Shift configuration updated successfully" 
    };
  }

  static async getShiftConfig(teamId) {
    return await this._getShiftConfig(teamId);
  }

  static async getRoster(teamId, year, month) {
    const doc = await db
      .collection("teams")
      .doc(teamId)
      .collection("rosters")
      .doc(`${year}-${month}`)
      .get();
      
    if (!doc.exists) {
      throw new Error(`Roster not found for ${year}-${month}`);
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
      
    return { 
      success: true,
      message: `Roster for ${year}-${month} deleted successfully` 
    };
  }

  static async getShiftFrequencyTable(teamId) {
    const users = await this._getUsersWithHistory(teamId);
    
    const table = users.map(user => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      shiftCounts: user.totalShiftsByType || {},
      totalShifts: Object.values(user.totalShiftsByType || {}).reduce((a, b) => a + b, 0),
      monthsPerShift: user.monthsPerShift || {},
      weekendAssignments: user.weekendAssignments || 0,
      currentShift: user.currentShift || "Unassigned"
    }));
    
    return { 
      success: true, 
      table,
      totalUsers: table.length
    };
  }
  
  // ==================== UTILITY METHODS ====================
  
  static async validateRosterIntegrity(teamId, year, month) {
    const roster = await this.getRoster(teamId, year, month);
    const issues = [];
    
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayRoster = roster.roster[d];
      
      if (!dayRoster || dayRoster.length === 0) {
        issues.push(`Day ${d}: No assignments`);
        continue;
      }
      
      const shiftCoverage = {};
      dayRoster.forEach(assignment => {
        shiftCoverage[assignment.shift] = (shiftCoverage[assignment.shift] || 0) + 1;
      });
      
      const requirements = this._getDayRequirements(roster.shiftConfig, year, month, d);
      
      for (const [shift, required] of Object.entries(requirements)) {
        const actual = shiftCoverage[shift] || 0;
        if (actual < required) {
          issues.push(`Day ${d}, ${shift}: ${actual}/${required} (understaffed)`);
        }
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      totalIssues: issues.length
    };
  }
}

module.exports = RosterService;