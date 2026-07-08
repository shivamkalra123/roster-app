const express = require("express");
const cors = require("cors");
require("dotenv").config();

const rosterRoutes = require("./routes/rosterRoute");
const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const teamMemberRoutes = require("./routes/teamMemberRoutes");
const leaveRoutes =
  require('./routes/leaveRoute');

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

// Routes
app.use("/api/roster", rosterRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/teams/:teamId", teamMemberRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date()
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});