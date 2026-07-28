// backend/index.js or server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const rosterRoutes = require("./routes/rosterRoute");
const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const teamMemberRoutes = require("./routes/teamMemberRoutes");
const leaveRoutes = require('./routes/leaveRoute');

const app = express();

// CORS configuration - Make sure this is BEFORE your routes
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // Allow all localhost origins for development
        if (origin.match(/^http:\/\/localhost:\d+$/)) {
            console.log('✅ Allowed localhost origin:', origin);
            return callback(null, true);
        }
        
        // List of allowed origins
        const allowedOrigins = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "https://roster-app-povc.onrender.com",
            "https://roster-app-amak.vercel.app",
            "https://roster-app-3pp2.vercel.app"
        ];
        
        if (allowedOrigins.includes(origin)) {
            console.log('✅ Allowed origin:', origin);
            return callback(null, true);
        }
        
        console.log('❌ Blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    optionsSuccessStatus: 200
};

// Apply CORS middleware - THIS MUST COME BEFORE ROUTES
app.use(cors(corsOptions));

// Log all requests
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'unknown'}`);
    next();
});

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
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        path: req.path
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📍 API URL: http://localhost:${PORT}/api`);
});