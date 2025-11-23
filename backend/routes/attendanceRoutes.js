const express = require("express");
const router = express.Router();

const {
  scanAttendance,
  debugAttendanceForSession,
} = require("../controllers/attendanceControllers");

// Route to scan attendance
router.post("/scan", scanAttendance);
// Debug route to fetch attendance docs for a session
router.get("/debug/:sessionId", debugAttendanceForSession);
module.exports = router;
