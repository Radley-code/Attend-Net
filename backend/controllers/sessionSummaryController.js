const mongoose = require("mongoose");
const SessionSummary = require("../models/sessionSummary");
const Attendance = require("../models/attendance");
const User = require("../models/user");
const { getIO } = require("../utils/socket");

// Create session summary when session ends
const createSessionSummary = async (sessionId) => {
  try {
    // Get session details - use mongoose.model to avoid duplicate import
    const Session = mongoose.model("Session");
    const session = await Session.findById(sessionId).populate('coordinator');
    if (!session) {
      console.log(`Session ${sessionId} not found for summary creation`);
      return;
    }

    // Get all attendance records for this session
    const attendanceRecords = await Attendance.find({ sessionId })
      .populate('studentId', 'name department');

    // Calculate summary statistics
    const totalStudents = attendanceRecords.length;
    const presentStudents = attendanceRecords.filter(r => r.status === 'present').length;
    const absentStudents = totalStudents - presentStudents;
    const attendanceRate = totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0;

    // Calculate total scans performed
    const totalScansPerformed = attendanceRecords.reduce((sum, record) => sum + record.totalScans, 0);

    // Prepare detailed records
    const detailedRecords = attendanceRecords.map(record => ({
      studentId: record.studentId._id,
      name: record.studentId.name,
      department: record.studentId.department,
      status: record.status,
      presentCount: record.presentCount,
      totalScans: record.totalScans,
      attendancePercentage: record.totalScans > 0 ? (record.presentCount / record.totalScans) * 100 : 0,
    }));

    // Create session summary
    const summary = new SessionSummary({
      sessionId: session._id,
      coordinatorId: session.coordinator._id,
      course: session.course,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      interval: session.interval,
      departments: session.departments.filter(dept => dept && dept.trim().length > 0),
      totalStudents,
      presentStudents,
      absentStudents,
      attendanceRate,
      attendanceRecords: detailedRecords,
      totalScansPerformed,
      sessionEndedAt: new Date(),
    });

    await summary.save();
    console.log(`Session summary created for session ${sessionId}`);
    
    // Emit socket event for real-time updates
    const io = getIO();
    if (io) {
      io.to(`coordinator_${session.coordinator._id}`).emit("sessionSummaryCreated", {
        sessionId: session._id,
        course: session.course,
        date: session.date,
        attendanceRate: attendanceRate,
        totalScansPerformed: totalScansPerformed,
        totalStudents: totalStudents,
        presentStudents: presentStudents,
        absentStudents: absentStudents
      });
    }
    
    return summary;

  } catch (error) {
    console.error('Error creating session summary:', error);
    throw error;
  }
};

// Get session summaries for a coordinator
const getSessionSummaries = async (req, res) => {
  try {
    const coordinatorId = req.user.id;
    const { page = 1, limit = 10, department, course, dateFrom, dateTo } = req.query;

    // Build filter
    const filter = { coordinatorId };
    
    if (department) {
      filter.departments = { $in: [department] };
    }
    
    if (course) {
      filter.course = { $regex: course, $options: 'i' };
    }
    
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const summaries = await SessionSummary.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('coordinatorId', 'name email');

    const total = await SessionSummary.countDocuments(filter);

    res.json({
      summaries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Error getting session summaries:', error);
    res.status(500).json({ message: 'Failed to get session summaries' });
  }
};

// Get single session summary
const getSessionSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await SessionSummary.findById(id)
      .populate('coordinatorId', 'name email')
      .populate('attendanceRecords.studentId', 'name email department');

    if (!summary) {
      return res.status(404).json({ message: 'Session summary not found' });
    }

    res.json(summary);
  } catch (error) {
    console.error('Error getting session summary:', error);
    res.status(500).json({ message: 'Failed to get session summary' });
  }
};

// Get attendance statistics for filtering
const getAttendanceStats = async (req, res) => {
  try {
    const coordinatorId = req.user.id;
    const { department, course, dateFrom, dateTo } = req.query;

    // Build filter
    const filter = { coordinatorId };
    
    if (department) {
      filter.departments = { $in: [department] };
    }
    
    if (course) {
      filter.course = { $regex: course, $options: 'i' };
    }
    
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const stats = await SessionSummary.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalStudents: { $sum: '$totalStudents' },
          totalPresent: { $sum: '$presentStudents' },
          totalAbsent: { $sum: '$absentStudents' },
          averageAttendanceRate: { $avg: '$attendanceRate' },
          totalScans: { $sum: '$totalScansPerformed' },
        }
      }
    ]);

    const result = stats[0] || {
      totalSessions: 0,
      totalStudents: 0,
      totalPresent: 0,
      totalAbsent: 0,
      averageAttendanceRate: 0,
      totalScans: 0,
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({ message: 'Failed to get attendance statistics' });
  }
};

module.exports = {
  createSessionSummary,
  getSessionSummaries,
  getSessionSummary,
  getAttendanceStats,
};
