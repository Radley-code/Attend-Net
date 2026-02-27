const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  course: {
    type: String,
    required: true,
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
  departments: {
    type: [String],
    required: true,
  },
  // each session belongs to a coordinator, ensuring uniqueness per user
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coordinator",
    required: true,
  },
  // interval in minutes for automatic scans; 0 means manual
  interval: {
    type: Number,
    default: 5,
  },
  // store last computed attendance rate (percentage)
  attendanceRate: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Session", sessionSchema);
