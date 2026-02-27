const Session = require("../models/Session");
const {
  performScanForSession,
} = require("../controllers/attendanceControllers");
const { getIO } = require("./socket");

// keep track of timers per session
const timers = {};

function scheduleSession(session) {
  if (!session || !session._id) return;
  const now = new Date();
  const dateString =
    session.date instanceof Date
      ? session.date.toISOString().split("T")[0]
      : session.date.split("T")[0];
  const start = new Date(`${dateString}T${session.startTime}`);
  const end = new Date(`${dateString}T${session.endTime}`);

  // clear existing timers
  cancelSessionSchedule(session._id);

  if (end <= now) {
    // already finished
    return;
  }

  const intervalMinutes = session.interval || 0;

  // when start time arrives, emit event and optionally perform first scan
  const startDelay = Math.max(0, start - now);
  const startTimer = setTimeout(async () => {
    const io = getIO();
    if (io) {
      io.to(`coordinator_${session.coordinator}`).emit(
        "sessionStarted",
        session,
      );
    }
    // perform an immediate scan at the beginning of the session
    await performScanAndEmit(session);

    // if an interval is defined schedule further scans
    if (intervalMinutes > 0) {
      const intervalId = setInterval(
        async () => {
          const now2 = new Date();
          if (now2 > end) {
            clearInterval(intervalId);
            return;
          }
          await performScanAndEmit(session);
        },
        intervalMinutes * 60 * 1000,
      );
      timers[session._id] = { intervalId };
    }
  }, startDelay);

  timers[session._id] = { startTimer };
}

async function performScanAndEmit(session) {
  try {
    const result = await performScanForSession(session);
    const io = getIO();
    if (io) {
      io.to(`coordinator_${session.coordinator}`).emit("scanResult", {
        sessionId: session._id,
        course: session.course,
        timestamp: new Date(),
        ...result,
      });
    }
  } catch (err) {
    console.error("Error during scheduled scan for session", session._id, err);
  }
}

function cancelSessionSchedule(sessionId) {
  const t = timers[sessionId];
  if (t) {
    if (t.startTimer) clearTimeout(t.startTimer);
    if (t.intervalId) clearInterval(t.intervalId);
    delete timers[sessionId];
  }
}

async function initSchedules() {
  try {
    const now = new Date();
    const sessions = await Session.find({ endTime: { $gt: now } });
    sessions.forEach((s) => scheduleSession(s));
  } catch (err) {
    console.error("Failed to initialize session schedules", err);
  }
}

module.exports = { scheduleSession, cancelSessionSchedule, initSchedules };
