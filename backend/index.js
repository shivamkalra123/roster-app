const express = require("express");
const cors = require("cors");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const rosterRoutes = require("./routes/rosterRoute");

const app = express();


// 🔥 Allow frontend requests
app.use(cors());

// Parse JSON
app.use(express.json());

app.use("/users", userRoutes);
app.use("/roster", rosterRoutes);

app.listen(3000, () => {
  console.log("Server started on port 3000");
});