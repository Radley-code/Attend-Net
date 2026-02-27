const Session = require("../models/Session");

// helper to compute status for a session based on local time
function computeStatus(session) {
  const now = new Date();
  const dateString = session.date.toISOString().split("T")[0];
  const start = new Date(`${dateString}T${session.startTime}`);
  const end = new Date(`${dateString}T${session.endTime}`);
  if (now >= start && now <= end) return "active";
  if (now < start) return "upcoming";
  return "ended";
}

const createSession = async (req, res) => {
  try {
    const { course, date, startTime, endTime, departments, interval } =
      req.body;
    const coordinatorId = req.user && req.user.id;
    if (!coordinatorId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const newSession = new Session({
      course,
      date,
      startTime,
      endTime,
      departments,
      coordinator: coordinatorId,
      interval:
        typeof interval === "number" ? interval : parseInt(interval, 10) || 0,
    });
    await newSession.save();
    // schedule scans for this session
    scheduleSession(newSession);
    res
      .status(201)
      .json({ message: "Session created successfully", session: newSession });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ message: "Server error during session creation" });
  }
};
// return all sessions that belong to the current coordinator
const { scheduleSession } = require("../utils/sessionScheduler");

const getSessionsForCoordinator = async (req, res) => {
  try {
    const coordinatorId = req.user && req.user.id;
    if (!coordinatorId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const sessions = await Session.find({ coordinator: coordinatorId }).sort({
      date: -1,
      startTime: -1,
    });
    // schedule any that have not yet been scheduled (server restart recovery)
    sessions.forEach((s) => scheduleSession(s));
    const enriched = sessions.map((s) => {
      const status = computeStatus(s);
      return { ...s.toObject(), status };
    });
    res.status(200).json({ sessions: enriched });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ message: "Server error fetching sessions" });
  }
};

module.exports = {
  createSession,
  getSessionsForCoordinator,
};
