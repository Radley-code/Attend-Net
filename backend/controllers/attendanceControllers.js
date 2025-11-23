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
    const savedIds = [];

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
      const saved = await record.save();
      savedIds.push(saved._id);
      console.log("Saved attendance id:", saved._id.toString());
    }

    // Debug: how many attendance docs exist for this session in DB
    const totalForSession = await Attendance.countDocuments({
      sessionId: session._id,
    });
    console.log("Total attendance documents for session:", totalForSession);
    console.log("Saved IDs length:", savedIds.length);

    // Populate student/session details for the saved attendance records only
    let enriched = [];
    if (savedIds.length > 0) {
      enriched = await Attendance.find({ _id: { $in: savedIds } })
        .populate("studentId", "name email department")
        .populate("sessionId", "course date startTime endTime");
    }

    // return the populated attendance records as the results
    results = enriched;

    // Normalize and categorize results for frontend convenience
    const present = results
      .filter((r) => r.status === "present")
      .map((r) => ({
        id: r._id,
        studentId: r.studentId._id,
        name: r.studentId.name,
        department: r.studentId.department,
        status: "Present",
        timestamp: r.timestamp,
      }));

    const absent = results
      .filter((r) => r.status === "absent")
      .map((r) => ({
        id: r._id,
        studentId: r.studentId._id,
        name: r.studentId.name,
        department: r.studentId.department,
        status: "Absent",
        timestamp: r.timestamp,
      }));

    return res.status(201).json({
      message: "Attendance scan complete.",
      counts: {
        total: results.length,
        present: present.length,
        absent: absent.length,
      },
      present,
      absent,
    });
  } catch (err) {
    console.error("Error scanning attendance:", err);
    res
      .status(500)
      .json({ message: "Server error during attendance scanning" });
  }
};

module.exports = { scanAttendance };

// Debug: return all attendance records for a session (populated)
const debugAttendanceForSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId)
      return res.status(400).json({ message: "sessionId required" });
    const docs = await Attendance.find({ sessionId })
      .populate("studentId", "name email department macAddress")
      .populate("sessionId", "course date startTime endTime");
    return res.status(200).json({ message: "Attendance docs fetched", docs });
  } catch (err) {
    console.error("Error in debugAttendanceForSession:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching attendance docs" });
  }
};

module.exports = { scanAttendance, debugAttendanceForSession };
