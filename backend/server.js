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

// Connect to MongoDB
const uri = process.env.MONGODB_URI;

mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
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

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  console.log(`AttendNet Server is running on http://${HOST}:${PORT}`);
  console.log(`Access from your network: http://192.168.1.101:${PORT}`);
  console.log(
    `Frontend should access backend at: http://192.168.1.101:${PORT}`,
  );
});

module.exports = app;
