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
});

module.exports = mongoose.model("Session", sessionSchema);
