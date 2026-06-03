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

// Define allowed origins
const allowedOrigins = [
    'https://v6ln8kdl-5173.inc1.devtunnels.ms',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://roster-app-povc.onrender.com',
    'https://roster-app-amak.vercel.app',
    'https://roster-app-3pp2.vercel.app',
];

// Configure CORS properly
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
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

app.use('/api/leave', leaveRoutes);

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