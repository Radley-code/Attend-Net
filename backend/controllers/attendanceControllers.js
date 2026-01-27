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

    // Normalize MAC addresses for robust comparison: remove separators and lowercase
    const normalizeMac = (m) =>
      (m || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-f0-9]/gi, "");
    const normalizedConnectedSet = new Set(
      connectedMacs.map((m) => normalizeMac(m)),
    );

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get departments normalized and try a robust lookup for students
    const sessionDepts = Array.isArray(session.departments)
      ? session.departments.map((d) => (d || "").trim()).filter(Boolean)
      : [];

    // first try exact-match query
    let students = [];
    if (sessionDepts.length > 0) {
      students = await User.find({ department: { $in: sessionDepts } });
    }

    // if no students found, try a case-insensitive match using regexes
    if ((!students || students.length === 0) && sessionDepts.length > 0) {
      const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const deptRegexes = sessionDepts.map(
        (d) => new RegExp(`^${escapeRegExp(d)}$`, "i"),
      );
      students = await User.find({ department: { $in: deptRegexes } });
    }
    let results = [];
    const savedIds = [];

    for (let student of students) {
      const studentMacNormalized = normalizeMac(student.macAddress);
      const isPresent = normalizedConnectedSet.has(studentMacNormalized);
      const status = isPresent ? "Present" : "Absent";
      //console log for debugging error had when checking for students present
      console.log(
        `Checking student ${student.name} mac: ${student.macAddress} normalized: ${studentMacNormalized} present: ${isPresent}`,
      );

      // Upsert attendance so repeated scans update existing records instead of creating duplicates
      const saved = await Attendance.findOneAndUpdate(
        { studentId: student._id, sessionId: session._id },
        {
          department: student.department,
          status: status.toLowerCase(),
          timestamp: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      savedIds.push(saved._id);
      console.log(
        "Saved/updated attendance id:",
        saved._id.toString(),
        "status:",
        saved.status,
      );
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
      console.log("Enriched data sample:", enriched[0]);
    }

    // return the populated attendance records as the results
    results = enriched;

    // Normalize and categorize results for frontend convenience
    const present = results
      .filter((r) => r.status === "present")
      .map((r) => ({
        name: r.studentId.name,
        department: r.studentId.department,
        course: r.sessionId.course,
        status: "Present",
        timestamp: r.timestamp,
      }));

    const absent = results
      .filter((r) => r.status === "absent")
      .map((r) => ({
        name: r.studentId.name,
        department: r.studentId.department,
        course: r.sessionId.course,
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
