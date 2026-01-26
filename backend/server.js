require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());

app.use(cors());

// Connect to MongoDB
const uri = process.env.MONGODB_URI;

mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Connection error:", err));

// Simple test route
app.get("/", (req, res) => {
  res.send("AttendNet Server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
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

//Import coordinator routes to reset the password(this is protected route)
const coordinatorRoutes = require("./routes/coordinatorRoutes"); 
app.use("/api/coordinator", coordinatorRoutes);

module.exports = app;
