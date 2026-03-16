const db = require("../config/firebase");

class UserController {

  static async createUser(req, res) {
    try {

      const { teamId } = req.params;
      const { name, baseGroup } = req.body;

      const userRef = await db
        .collection("teams")
        .doc(teamId)
        .collection("users")
        .add({
          name,
          baseGroup,
          shiftCounts: {
            MORNING_8_5: 0,
            MORNING_11_8: 0,
            EVENING_4_1: 0,
            NIGHT_11_8: 0
          }
        });

      res.json({
        message: "User created",
        userId: userRef.id
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkCreateUsers(req, res) {
    try {

      const { teamId, users } = req.body;

      const batch = db.batch();

      users.forEach(user => {

        const ref = db
          .collection("teams")
          .doc(teamId)
          .collection("users")
          .doc();

        batch.set(ref, {
          name: user.name,
          baseGroup: user.baseGroup,
          shiftCounts: {
            MORNING_8_5: 0,
            MORNING_11_8: 0,
            EVENING_4_1: 0,
            NIGHT_11_8: 0
          }
        });

      });

      await batch.commit();

      res.json({
        message: `${users.length} users inserted`
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async rebuildShiftCounts(req, res) {

    try {

      const { teamId } = req.params;

      const defaultCounts = {
        MORNING_8_5: 0,
        MORNING_11_8: 0,
        EVENING_4_1: 0,
        NIGHT_11_8: 0
      };

      const usersSnap = await db
        .collection("teams")
        .doc(teamId)
        .collection("users")
        .get();

      const userCounts = {};

      usersSnap.docs.forEach(doc => {
        userCounts[doc.id] = { ...defaultCounts };
      });

      const rostersSnap = await db
        .collection("teams")
        .doc(teamId)
        .collection("rosters")
        .get();

      for (const rosterDoc of rostersSnap.docs) {

        const roster = rosterDoc.data().roster || {};

        const countedThisMonth = new Set();

        for (const dayKey in roster) {

          const entries = roster[dayKey];

          entries.forEach(entry => {

            if (entry.shift === "OFF") return;

            const uniqueKey = `${rosterDoc.id}_${entry.userId}`;

            if (countedThisMonth.has(uniqueKey)) return;

            if (!userCounts[entry.userId]) {
              userCounts[entry.userId] = { ...defaultCounts };
            }

            userCounts[entry.userId][entry.shift]++;

            countedThisMonth.add(uniqueKey);

          });

        }

      }

      const batch = db.batch();

      usersSnap.docs.forEach(userDoc => {

        const ref = db
          .collection("teams")
          .doc(teamId)
          .collection("users")
          .doc(userDoc.id);

        batch.update(ref, {
          shiftCounts: userCounts[userDoc.id]
        });

      });

      await batch.commit();

      res.json({
        message: "Shift counts rebuilt successfully",
        counts: userCounts
      });

    } catch (error) {

      res.status(500).json({
        error: error.message
      });

    }

  }


static async initJanMarch(req,res){

try{

const {teamId} = req.params;

const JAN = {
"Akshit Arora":"MORNING_11_8",
"Aleena Paul.k":"EVENING_4_1",
"Junaid Khan":"MORNING_8_5",
"Kishore S":"MORNING_11_8",
"Neha Jose":"NIGHT_11_8",
"Neha Singh":"NIGHT_11_8",
"Ramyashree M":"EVENING_4_1",
"Ritesh Singh":"MORNING_8_5",
"Shivam Kalra":"MORNING_11_8",
"Yash Gulati":"MORNING_11_8",
"Hemalatha Vilvam": "MORNING_11_8",
"Gowda Mahalaxmi":"MORNING_8_5"
};

const FEB = {
"Akshit Arora":"EVENING_4_1",
"Gowda Mahalaxmi":"MORNING_11_8",
"Hemalatha Vilvam":"MORNING_8_5",
"Junaid Khan":"MORNING_11_8",
"Kishore S":"EVENING_4_1",
"Neha Singh":"EVENING_4_1",
"Ramyashree M":"NIGHT_11_8",
"Shivam Kalra":"MORNING_8_5",
"Yash Gulati":"MORNING_8_5",
"Neha Jose":"MORNING_8_5",
"Ritesh Singh":"MORNING_11_8",
"Aleena Paul.k":"NIGHT_11_8"
};

const MAR = {
"Akshit Arora":"MORNING_11_8",
"Aleena Paul.k":"MORNING_8_5",
"Gowda Mahalaxmi":"MORNING_11_8",
"Junaid Khan":"EVENING_4_1",
"Kishore S":"NIGHT_11_8",
"Neha Jose":"MORNING_11_8",
"Neha Singh":"MORNING_8_5",
"Ramyashree M":"MORNING_8_5",
"Ritesh Singh":"EVENING_4_1",
"Shivam Kalra":"NIGHT_11_8",
"Yash Gulati":"MORNING_8_5"
};

const usersSnap = await db
.collection("teams")
.doc(teamId)
.collection("users")
.get();

const batch = db.batch();

usersSnap.docs.forEach(doc=>{

const data = doc.data();

const counts = data.shiftCounts || {
MORNING_8_5:0,
MORNING_11_8:0,
EVENING_4_1:0,
NIGHT_11_8:0
};

function increment(map){
const shift = map[data.name];
if(shift){
counts[shift] = (counts[shift] || 0) + 1;
}
}

increment(JAN);
increment(FEB);
increment(MAR);

const ref = db
.collection("teams")
.doc(teamId)
.collection("users")
.doc(doc.id);

batch.update(ref,{
shiftCounts:counts
});

});

await batch.commit();

res.json({
message:"January, February and March shifts initialized"
});

}catch(error){

res.status(500).json({error:error.message});

}

}


}

module.exports = UserController;