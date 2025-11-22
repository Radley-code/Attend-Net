const Attendance = require("../models/attendance");
const Session = require("../models/Session");
const User = require("../models/user");

// Controller to handle attendance scanning
const scanAttendance = async (req, res) => {
  try {
    console.log("scanAttendance body:", req.body);
    const { sessionId } = req.body;
    // connectedMacs is an array of mac addresses detected during the scan
    let connectedMacs = req.body.connectedMacs;
    if (!Array.isArray(connectedMacs)) connectedMacs = [];

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    //Get all students in the departments for this session
    const students = await User.find({
      department: { $in: session.departments },
    });
    let results = [];

    for (let student of students) {
      const status = connectedMacs.includes(student.macAddress)
        ? "Present"
        : "Absent";
      //Record attendance
      const record = new Attendance({
        studentId: student._id,
        sessionId: session._id,
        department: student.department,
        status: status.toLowerCase(),
        timestamp: new Date(),
      });
      await record.save();
    }

    // Populate student/session details for all attendance records for this session
    const enriched = await Attendance.find({ sessionId: session._id })
      .populate("studentId", "name email department")
      .populate("sessionId", "course date startTime endTime");

    // return the populated attendance records as the results
    results = enriched;
    res.status(201).json({ message: "Attendance scan Complete.", results });
  } catch (err) {
    console.error("Error scanning attendance:", err);
    res
      .status(500)
      .json({ message: "Server error during attendance scanning" });
  }
};

module.exports = { scanAttendance };
