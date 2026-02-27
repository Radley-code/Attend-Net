const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true,
  },
  // store department name (matches `User.department`) instead of an ObjectId
  department: {
    type: String,
    required: true,
    trim: true,
  },
  // counters to track multiple scans within a session
  presentCount: {
    type: Number,
    default: 0,
  },
  totalScans: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["present", "absent"],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
