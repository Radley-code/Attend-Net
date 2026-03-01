const mongoose = require("mongoose");

const sessionSummarySchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true,
    unique: true,
  },
  coordinatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  interval: {
    type: Number,
    default: 0,
  },
  departments: [{
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Department name cannot be empty'
    }
  }],
  // Attendance summary
  totalStudents: {
    type: Number,
    default: 0,
  },
  presentStudents: {
    type: Number,
    default: 0,
  },
  absentStudents: {
    type: Number,
    default: 0,
  },
  attendanceRate: {
    type: Number,
    default: 0,
  },
  // Detailed attendance records
  attendanceRecords: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
    presentCount: {
      type: Number,
      default: 0,
    },
    totalScans: {
      type: Number,
      default: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
    },
  }],
  // Session metadata
  totalScansPerformed: {
    type: Number,
    default: 0,
  },
  sessionEndedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SessionSummary", sessionSummarySchema);
