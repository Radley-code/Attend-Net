require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:8080", "http://192.168.1.101:8080"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Connect to MongoDB and start server afterwards
const uri = process.env.MONGODB_URI;

// socket integration dependencies (used later)
const http = require("http");
const { Server } = require("socket.io");
const { setIO } = require("./utils/socket");
const { initSchedules } = require("./utils/sessionScheduler");

mongoose
  .connect(uri)
  .then(() => {
    console.log("MongoDB connected");

    // create http and socket servers only after DB is ready
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: ["http://localhost:8080", "http://192.168.1.101:8080"],
        methods: ["GET", "POST"],
      },
    });
    setIO(io);

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      // Join coordinator-specific room for personalized updates
      socket.on("joinCoordinatorRoom", (coordinatorId) => {
        socket.join(`coordinator_${coordinatorId}`);
        console.log(`Coordinator ${coordinatorId} joined room`);
      });

      // Join session-specific room for attendance updates
      socket.on("joinSession", (sessionId) => {
        socket.join(`session-${sessionId}`);
        console.log(`User ${socket.id} joined session ${sessionId}`);
      });

      socket.on("leaveSession", (sessionId) => {
        socket.leave(`session-${sessionId}`);
        console.log(`User ${socket.id} left session ${sessionId}`);
      });

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });

    const PORT = process.env.PORT || 3000;
    const HOST = "0.0.0.0"; // Listen on all network interfaces

    server.listen(PORT, HOST, () => {
      console.log(`AttendNet Server is running on http://${HOST}:${PORT}`);
      console.log(`Access from your network: http://192.168.1.101:${PORT}`);
      console.log(
        `Frontend should access backend at: http://192.168.1.101:${PORT}`,
      );
      // initialize schedules after server starts
      initSchedules();
    });
  })
  .catch((err) => console.error("Connection error:", err));

// Simple test route
app.get("/", (req, res) => {
  res.send(" Server is running");
});

// Import user routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Import session routes
const sessionRoutes = require("./routes/sessionRoutes");
app.use("/api/sessions", sessionRoutes);

// Import attendance routes
const attendanceRoutes = require("./routes/attendanceRoutes");
app.use("/api/attendance", attendanceRoutes);

// Import login/coordinator routes
const loginRoutes = require("./routes/loginRoutes");
app.use("/api/coordinator", loginRoutes);

// Import admin routes
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Graceful shutdown handling
const { cancelAllSchedules } = require("./utils/sessionScheduler");

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  cancelAllSchedules();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  cancelAllSchedules();
  process.exit(0);
});

module.exports = app;
