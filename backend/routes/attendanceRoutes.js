const express = require("express");
const router = express.Router();
const verifyCoordinator = require("../middleware/auth");

const {
  scanAttendance,
  debugAttendanceForSession,
} = require("../controllers/attendanceControllers");

// Route to scan attendance (must be done by a logged in coordinator)
router.post("/scan", verifyCoordinator, scanAttendance);
// Debug route to fetch attendance docs for a session
router.get("/debug/:sessionId", verifyCoordinator, debugAttendanceForSession);
module.exports = router;
