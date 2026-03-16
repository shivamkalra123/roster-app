const db = require("../config/firebase");

class RosterService {
  static async generateRoster(teamId, year, month) {
    const usersSnap = await db.collection("teams").doc(teamId).collection("users").get();

    let allUsers = usersSnap.docs.map((doc) => {
      const data = doc.data();
      const shiftCounts = data.shiftCounts || { MORNING_8_5: 0, MORNING_11_8: 0, EVENING_4_1: 0, NIGHT_11_8: 0 };
      return {
        id: doc.id,
        ...data,
        shiftCounts,
        totalShifts: Object.values(shiftCounts).reduce((a, b) => a + b, 0),
      };
    });

    if (allUsers.length !== 12) {
      throw new Error("Team must have exactly 12 users with baseGroup A, B, or C assigned.");
    }

    // Fairness picker logic
    function pickLeastUsed(pool, shiftType) {
      const minShiftCount = Math.min(...pool.map(u => u.shiftCounts[shiftType] || 0));
      let candidates = pool.filter(u => (u.shiftCounts[shiftType] || 0) === minShiftCount);
      const minTotal = Math.min(...candidates.map(u => u.totalShifts));
      candidates = candidates.filter(u => u.totalShifts === minTotal);
      const randomIndex = Math.floor(Math.random() * candidates.length);
      const chosenUser = candidates[randomIndex];
      const idx = pool.findIndex(u => u.id === chosenUser.id);
      return pool.splice(idx, 1)[0];
    }

    // 1. DETERMINE ROTATION FIRST
    // This decides which group works which weekend day this month
    const rotation = month % 3;
    let patternMap;
    if (rotation === 1)      patternMap = { A: "SAT", B: "SUN", C: "OFF" };
    else if (rotation === 2) patternMap = { A: "SUN", B: "OFF", C: "SAT" };
    else                     patternMap = { A: "OFF", B: "SAT", C: "SUN" };

    const assignments = [];

    // 2. DYNAMICALLY ASSIGN SHIFT PROFILES
    ["A", "B", "C"].forEach(groupName => {
      const weekendRole = patternMap[groupName];
      let groupPool = allUsers.filter(u => u.baseGroup === groupName);
      
      let shiftsToAssign;
      
      // If the group is working Saturday or Sunday, they MUST have a night shift
      if (weekendRole === "SAT" || weekendRole === "SUN") {
        shiftsToAssign = ["MORNING_8_5", "MORNING_11_8", "EVENING_4_1", "NIGHT_11_8"];
      } else {
        // This is the group OFF on the weekend -> No Night Shift, Double 8_5 instead
        shiftsToAssign = ["MORNING_8_5", "MORNING_8_5", "MORNING_11_8", "EVENING_4_1"];
      }

      shiftsToAssign.forEach(shiftType => {
        const user = pickLeastUsed(groupPool, shiftType);
        user.shiftType = shiftType;
        user.weekendRole = weekendRole; // Track if they work SAT, SUN, or OFF
        assignments.push(user);
      });
    });

    // 3. GENERATE THE CALENDAR
    const daysInMonth = new Date(year, month, 0).getDate();
    const roster = {};

    function isUserWorking(weekendRole, dayName) {
      if (weekendRole === "SAT") return !["Friday", "Sunday"].includes(dayName);
      if (weekendRole === "SUN") return !["Monday", "Saturday"].includes(dayName);
      return !["Saturday", "Sunday"].includes(dayName); // The "OFF" group
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

      roster[d] = assignments.map((user) => ({
        userId: user.id,
        name: user.name,
        shift: isUserWorking(user.weekendRole, dayName) ? user.shiftType : "OFF",
      }));
    }

    // 4. SAVE AND UPDATE COUNTS
    await db.collection("teams").doc(teamId).collection("rosters").doc(`${year}-${month}`).set({ roster, createdAt: new Date() });

    const batch = db.batch();
    assignments.forEach((user) => {
      const userRef = db.collection("teams").doc(teamId).collection("users").doc(user.id);
      const newCounts = { ...user.shiftCounts };
      newCounts[user.shiftType] = (newCounts[user.shiftType] || 0) + 1;
      batch.update(userRef, { shiftCounts: newCounts });
    });

    await batch.commit();
    return { message: "Roster generated with dynamic night shift assignment." };
  }

  static async getRoster(teamId, year, month) {
    const doc = await db.collection("teams").doc(teamId).collection("rosters").doc(`${year}-${month}`).get();
    if (!doc.exists) throw new Error("No roster found.");

    const rawData = doc.data().roster;
    const summary = {
      Saturday: { MORNING_8_5: [], MORNING_11_8: [], EVENING_4_1: [], NIGHT_11_8: [] },
      Sunday: { MORNING_8_5: [], MORNING_11_8: [], EVENING_4_1: [], NIGHT_11_8: [] },
      "MON-FRI": { MORNING_8_5: [], MORNING_11_8: [], EVENING_4_1: [], NIGHT_11_8: [] },
    };

    Object.keys(rawData).forEach((dayNum) => {
      const date = new Date(year, month - 1, parseInt(dayNum));
      let block = "MON-FRI";
      if (date.getDay() === 6) block = "Saturday";
      else if (date.getDay() === 0) block = "Sunday";

      rawData[dayNum].forEach((entry) => {
        if (entry.shift !== "OFF") {
          const shiftList = summary[block][entry.shift];
          if (!shiftList.includes(entry.name)) shiftList.push(entry.name);
        }
      });
    });

    return summary;
  }
}

module.exports = RosterService;