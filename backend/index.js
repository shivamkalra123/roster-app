const express = require("express");
const cors = require("cors");
require("dotenv").config();

const rosterRoutes = require("./routes/rosterRoute");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const teamRoutes = require("./routes/teamRoutes");
const teamMemberRoutes = require("./routes/teamMemberRoutes");
const leaveRoutes =
  require('./routes/leaveRoute');

const app = express();

const defaultAllowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://roster-app-povc.onrender.com",
    "https://roster-app-amak.vercel.app",
    "https://roster-app-3pp2.vercel.app"
];

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsAllowedOrigins = allowedOrigins.length
    ? allowedOrigins
    : defaultAllowedOrigins;

// Configure CORS properly
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (corsAllowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
};

// Apply CORS middleware (handles OPTIONS preflight automatically)
app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use("/api/roster", rosterRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admins", adminRoutes);
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
