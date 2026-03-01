const { createSessionSummary } = require('../controllers/sessionSummaryController');
const {
  performScanForSession,
} = require("../controllers/attendanceControllers");
const { getIO } = require("./socket");
const mongoose = require("mongoose");

// keep track of timers per session
const timers = {};

function scheduleSession(session) {
  if (!session || !session._id) return;
  
  // Check if already scheduled to prevent duplicates
  if (timers[session._id]) {
    console.log(`Session ${session._id} already scheduled, skipping`);
    return;
  }
  
  const now = new Date();
  const dateString =
    session.date instanceof Date
      ? session.date.toISOString().split("T")[0]
      : session.date.split("T")[0];
  const start = new Date(`${dateString}T${session.startTime}`);
  const end = new Date(`${dateString}T${session.endTime}`);

  if (end <= now) {
    // already finished
    return;
  }

  const intervalMinutes = session.interval || 0;
  console.log(`Scheduling session ${session._id} (${session.course}) - Start: ${start}, End: ${end}, Interval: ${intervalMinutes}min`);

  // when start time arrives, emit event and optionally perform first scan
  const startDelay = Math.max(0, start - now);
  const startTimer = setTimeout(async () => {
    console.log(`Session ${session._id} started, performing initial scan`);
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
      console.log(`Setting up interval scans every ${intervalMinutes} minutes for session ${session._id}`);
      const intervalId = setInterval(
            async () => {
              const now2 = new Date();
              if (now2 >= end) {
                console.log(`Session ${session._id} ended, stopping interval scans`);
                clearInterval(intervalId);
                delete timers[session._id];
                
                // Create session summary when session ends
                try {
                  await createSessionSummary(session._id);
                  console.log(`Session summary created for ended session ${session._id}`);
                } catch (error) {
                  console.error(`Failed to create session summary for ${session._id}:`, error);
                }
                
                return;
              }
              console.log(`Performing scheduled scan for session ${session._id}`);
              await performScanAndEmit(session);
            },
            intervalMinutes * 60 * 1000,
          );
      // Store the interval timer
      if (!timers[session._id]) {
        timers[session._id] = {};
      }
      timers[session._id].intervalId = intervalId;
    }
  }, startDelay);

  // Store the start timer
  if (!timers[session._id]) {
    timers[session._id] = {};
  }
  timers[session._id].startTimer = startTimer;
}

async function performScanAndEmit(session) {
  try {
    // Check if session still exists and is valid
    const Session = mongoose.model("Session");
    const currentSession = await Session.findById(session._id);
    if (!currentSession) {
      console.log(`Session ${session._id} no longer exists, cancelling schedule`);
      cancelSessionSchedule(session._id);
      return;
    }
    
    const result = await performScanForSession(currentSession);
    const io = getIO();
    if (io) {
      io.to(`coordinator_${currentSession.coordinator}`).emit("scanResult", {
        sessionId: currentSession._id,
        course: currentSession.course,
        timestamp: new Date(),
        ...result,
      });
    }
  } catch (err) {
    console.error("Error during scheduled scan for session", session._id, err.message);
    // Don't cancel the schedule on error, just log it
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

function cancelAllSchedules() {
  Object.keys(timers).forEach(sessionId => {
    cancelSessionSchedule(sessionId);
  });
  console.log('All session schedules cancelled');
}

async function initSchedules() {
  try {
    const now = new Date();
    // Only schedule sessions that haven't ended yet
    const Session = mongoose.model("Session");
    const sessions = await Session.find({ endTime: { $gt: now } });
    console.log(`Found ${sessions.length} upcoming/active sessions to schedule`);
    
    sessions.forEach((s) => {
      const dateString = s.date instanceof Date 
        ? s.date.toISOString().split("T")[0] 
        : s.date.split("T")[0];
      const start = new Date(`${dateString}T${s.startTime}`);
      const end = new Date(`${dateString}T${s.endTime}`);
      
      // Only schedule if session hasn't started yet or is currently active
      if (start <= now && now < end) {
        console.log(`Session ${s._id} is currently active, scheduling immediate scan`);
        // For already active sessions, start scanning immediately
        performScanAndEmit(s);
        
        // Set up interval if needed
        if (s.interval > 0) {
          const intervalId = setInterval(
            async () => {
              const now2 = new Date();
              if (now2 >= end) {
                console.log(`Session ${s._id} ended, stopping interval scans`);
                clearInterval(intervalId);
                delete timers[s._id];
                try {
                  await createSessionSummary(s._id);
                  console.log(`Session summary created for ended session ${s._id}`);
                } catch (error) {
                  console.error(`Failed to create session summary for ${s._id}:`, error);
                }
                return;
              }
              console.log(`Performing scheduled scan for active session ${s._id}`);
              await performScanAndEmit(s);
            },
            s.interval * 60 * 1000,
          );
          timers[s._id] = { intervalId };
        }
      } else if (start > now) {
        // Schedule upcoming sessions normally
        scheduleSession(s);
      }
    });
  } catch (err) {
    console.error("Failed to initialize session schedules", err);
  }
}

module.exports = { scheduleSession, cancelSessionSchedule, cancelAllSchedules, initSchedules };
