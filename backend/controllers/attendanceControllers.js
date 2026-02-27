const Attendance = require("../models/attendance");
const Session = require("../models/Session");
const User = require("../models/user");
const { getIO } = require("../utils/socket");

// perform scan logic given a session document, optionally a list of mac addresses
async function performScanForSession(session, connectedMacs = []) {
  if (!session || !session._id) throw new Error("Session required for scan");
  // refresh session from database to get latest data
  const sess = await Session.findById(session._id);
  if (!sess) throw new Error("Session not found");

  // derived date/time
  const now = new Date();
  const dateString = sess.date.toISOString().split("T")[0];
  const endDatetime = new Date(`${dateString}T${sess.endTime}`);
  if (now > endDatetime) {
    throw new Error("Session has already ended");
  }

  // if no macs provided, attempt multiple ARP/network lookups
  if (!Array.isArray(connectedMacs)) connectedMacs = [];
  if (connectedMacs.length === 0) {
    try {
      const { execSync } = require("child_process");
      const found = new Set();
      const macRegex = /([0-9a-f]{2}[-:]){5}[0-9a-f]{2}/gi;

      // Method 1: Traditional ARP scan
      try {
        const arpOutput = execSync("arp -a", { encoding: "utf-8" });
        let m;
        while ((m = macRegex.exec(arpOutput))) {
          found.add(m[0].replace(/-/g, ":").toUpperCase());
        }
      } catch (e) {
        console.log("ARP method 1 failed", e.message);
      }

      // Method 2: Windows Get-NetNeighbor (PowerShell) - most comprehensive
      try {
        const psCmd =
          'powershell -Command "Get-NetNeighbor -AddressFamily IPv4 -State Reachable | Select-Object -ExpandProperty LinkLayerAddress"';
        const psOutput = execSync(psCmd, { encoding: "utf-8" });
        const lines = psOutput.split("\n");
        lines.forEach((line) => {
          const mac = line.trim().replace(/-/g, ":").toUpperCase();
          if (macRegex.test(mac)) {
            found.add(mac);
          }
        });
      } catch (e) {
        console.log("PowerShell Get-NetNeighbor method failed", e.message);
      }

      // Method 3: netstat (may show MAC in some configurations)
      try {
        const netstatOutput = execSync("netstat -an", { encoding: "utf-8" });
        let m;
        while ((m = macRegex.exec(netstatOutput))) {
          found.add(m[0].replace(/-/g, ":").toUpperCase());
        }
      } catch (e) {
        console.log("Netstat method failed", e.message);
      }

      // Method 4: ipconfig (parse MAC addresses from network interfaces)
      try {
        const ipconfigOutput = execSync("ipconfig /all", { encoding: "utf-8" });
        let m;
        while ((m = macRegex.exec(ipconfigOutput))) {
          found.add(m[0].replace(/-/g, ":").toUpperCase());
        }
      } catch (e) {
        console.log("ipconfig method failed", e.message);
      }

      connectedMacs = Array.from(found);
      console.log(
        `Auto-detected ${connectedMacs.length} MAC addresses from network:`,
        connectedMacs,
      );
    } catch (arpErr) {
      console.log("Network scan failed", arpErr.message);
    }
  }

  const normalizeMac = (m) =>
    (m || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-f0-9]/gi, "");
  const normalizedConnectedSet = new Set(
    connectedMacs.map((m) => normalizeMac(m)),
  );

  const sessionDepts = Array.isArray(sess.departments)
    ? sess.departments.map((d) => (d || "").trim()).filter(Boolean)
    : [];
  let students = [];
  if (sessionDepts.length > 0) {
    students = await User.find({ department: { $in: sessionDepts } });
  }
  if ((!students || students.length === 0) && sessionDepts.length > 0) {
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const deptRegexes = sessionDepts.map(
      (d) => new RegExp(`^${escapeRegExp(d)}$`, "i"),
    );
    students = await User.find({ department: { $in: deptRegexes } });
  }

  const savedIds = [];
  for (let student of students) {
    const studentMacNormalized = normalizeMac(student.macAddress);
    const isPresent = normalizedConnectedSet.has(studentMacNormalized);
    const status = isPresent ? "Present" : "Absent";

    // increment counters so we can compute student-specific averages
    const inc = { totalScans: 1 };
    if (isPresent) inc.presentCount = 1;

    const saved = await Attendance.findOneAndUpdate(
      { studentId: student._id, sessionId: sess._id },
      {
        $set: {
          department: student.department,
          status: status.toLowerCase(),
          timestamp: new Date(),
        },
        $inc: inc,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    savedIds.push(saved._id);
  }

  let enriched = [];
  if (savedIds.length > 0) {
    enriched = await Attendance.find({ _id: { $in: savedIds } })
      .populate("studentId", "name email department")
      .populate("sessionId", "course date startTime endTime");
  }

  const results = enriched;
  const present = results
    .filter((r) => r.status === "present")
    .map((r) => ({
      name: r.studentId.name,
      department: r.studentId.department,
      course: r.sessionId.course,
      session: r.sessionId._id,
      sessionLabel: `${r.sessionId.course} (${new Date(r.sessionId.date).toISOString().split("T")[0]})`,
      status: "Present",
      timestamp: r.timestamp,
      presentCount: r.presentCount || 0,
      totalScans: r.totalScans || 0,
      average: r.totalScans > 0 ? (r.presentCount / r.totalScans) * 100 : 0,
    }));
  const absent = results
    .filter((r) => r.status === "absent")
    .map((r) => ({
      name: r.studentId.name,
      department: r.studentId.department,
      course: r.sessionId.course,
      session: r.sessionId._id,
      sessionLabel: `${r.sessionId.course} (${new Date(r.sessionId.date).toISOString().split("T")[0]})`,
      status: "Absent",
      timestamp: r.timestamp,
      presentCount: r.presentCount || 0,
      totalScans: r.totalScans || 0,
      average: r.totalScans > 0 ? (r.presentCount / r.totalScans) * 100 : 0,
    }));

  const counts = {
    total: present.length + absent.length,
    present: present.length,
    absent: absent.length,
  };

  // update session attendance rate
  sess.attendanceRate =
    counts.total > 0 ? (counts.present / counts.total) * 100 : 0;
  await sess.save();

  return { present, absent, counts };
}

// Controller to handle attendance scanning
const scanAttendance = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const coordinatorId = req.user && req.user.id;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (coordinatorId && session.coordinator.toString() !== coordinatorId) {
      return res
        .status(403)
        .json({ message: "You are not allowed to scan this session" });
    }

    const now = new Date();
    const dateString = session.date.toISOString().split("T")[0];
    const endDatetime = new Date(`${dateString}T${session.endTime}`);
    if (now > endDatetime) {
      return res.status(400).json({ message: "Session has already ended" });
    }

    const connectedMacs = req.body.connectedMacs;
    const result = await performScanForSession(session, connectedMacs);

    // broadcast the result to coordinator via socket
    const io = getIO();
    if (io) {
      io.to(`coordinator_${session.coordinator}`).emit("scanResult", {
        sessionId: session._id,
        course: session.course,
        timestamp: new Date(),
        ...result,
      });
    }

    return res.status(201).json({
      message: "Attendance scan complete.",
      counts: result.counts,
      present: result.present,
      absent: result.absent,
    });
  } catch (err) {
    console.error("Error in scanAttendance:", err);
    return res
      .status(500)
      .json({ message: "Server error during attendance scanning" });
  }
};

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

module.exports = {
  scanAttendance,
  debugAttendanceForSession,
  performScanForSession,
};
