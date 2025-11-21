const express = require("express");
const router = express.Router();

const { scanAttendance } = require("../controllers/attendanceControllers");

// Route to scan attendance
router.post("/scan", scanAttendance);
module.exports = router;