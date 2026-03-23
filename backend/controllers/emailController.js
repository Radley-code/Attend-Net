const User = require('../models/user');
const Coordinator = require('../models/coordinator');
const Session = require('../models/session');
const Attendance = require('../models/attendance');
const EmailLog = require('../models/emailLog');
const EmailPreference = require('../models/emailPreference');
const emailService = require('../services/emailService');
const emailQueue = require('../services/emailQueue');
const smsController = require('../controllers/smsController');
const { getIO } = require('../utils/socket');

class EmailController {
  // Send attendance notification to student
  async sendAttendanceNotification(studentId, sessionId, status) {
    try {
      const student = await User.findById(studentId);
      const session = await Session.findById(sessionId).populate('coordinator');
      
      if (!student || !session) {
        throw new Error('Student or session not found');
      }

      const preference = await EmailPreference.findOne({
            userId: student._id,
            userType: 'User',
            isActive: true
          });

      if (!preference || !preference.preferences.attendanceNotifications) {
        return { success: true, skipped: true, reason: 'Email notifications disabled' };
      }

      const subject = `Attendance Update - ${session.course}`;
      const text = emailService.getStudentAttendanceTemplate(
        student.name,
        session.course,
        session.coordinator.name,
        status,
        new Date().toLocaleDateString(),
        new Date().toLocaleTimeString()
      );

      const result = await emailService.sendEmail(student.email, subject, text);

      // Log the email
      await EmailLog.create({
        recipient: student.email,
        recipientType: 'student',
        emailType: 'attendance_notification',
        subject: subject,
        content: text,
        status: result.success ? 'sent' : 'failed',
        messageId: result.success ? result.messageId : null,
        error: result.success ? null : result.error,
        metadata: {
          sessionId: sessionId,
          studentId: studentId,
          department: student.department
        },
        sentAt: result.success ? new Date() : null
      });

      return result;
    } catch (error) {
      console.error('Error sending attendance notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send session end summary emails to all students
  async sendSessionEndSummary(sessionId) {
    try {
      const session = await Session.findById(sessionId).populate('coordinator');
      if (!session) {
        throw new Error('Session not found');
      }

      // Get all attendance records for this session
      const attendanceRecords = await Attendance.find({ sessionId })
        .populate('studentId', 'name email department');

      // Calculate summary statistics
      const totalStudents = attendanceRecords.length;
      const presentStudents = attendanceRecords.filter(r => r.status === 'present');
      const absentStudents = attendanceRecords.filter(r => r.status === 'absent');

      const attendanceRate = totalStudents > 0 ? (presentStudents.length / totalStudents) * 100 : 0;

      // Prepare summary emails for all students
      const summaryEmails = attendanceRecords.map(record => {
        const status = record.status === 'present' ? 'Present' : 'Absent';
        const studentAttendanceRate = record.totalScans > 0 ? 
          (record.presentCount / record.totalScans) * 100 : 0;
        const studentName = record.studentId?.name || 'Unknown Student';
        const studentEmail = record.studentId?.email;

        return {
          to: studentEmail,
          subject: `Session Ended - ${session.course} - Summary`,
          text: emailService.getSessionEndSummaryTemplate(
            studentName,
            session.course,
            session.coordinator?.name || 'Coordinator',
            session.date.toLocaleDateString(),
            session.startTime,
            session.endTime,
            studentAttendanceRate,
            status
          ),
          recipientType: 'student',
          emailType: 'session_summary',
          metadata: {
            sessionId: sessionId,
            studentId: record.studentId._id,
            department: record.studentId.department,
            sessionEndSummary: true,
            attendanceRate: studentAttendanceRate,
            finalStatus: status.toLowerCase()
          }
        };
      });

      // Add all summary emails to queue for efficient processing
      emailQueue.sendMultiple(summaryEmails);

      // Send SMS notifications asynchronously
      setImmediate(async () => {
        try {
          const smsResult = await smsController.sendSessionEndSMS(sessionId);
          console.log('Session end SMS sent:', smsResult);
        } catch (smsError) {
          console.error('Error sending session end SMS:', smsError);
        }
      });

      return {
        success: true,
        totalNotified: summaryEmails.length,
        presentCount: presentStudents.length,
        absentCount: absentStudents.length,
        sessionAttendanceRate: attendanceRate
      };
    } catch (error) {
      console.error('Error sending session end summary:', error);
      return { success: false, error: error.message };
    }
  }

  // Send scan notifications to students about their attendance status
  async sendScanNotifications(session, presentStudents, absentStudents) {
    try {
      const allStudents = [...presentStudents, ...absentStudents];
      
      // Prepare emails for all students
      const scanEmails = allStudents.map(student => {
        // Student objects now have name and email properties directly
        const studentName = student.name;
        const studentEmail = student.email;
        const status = student.status; // "Present" or "Absent"
        
        return {
          to: studentEmail,
          subject: `Attendance Scan Update - ${session.course}`,
          text: emailService.getStudentAttendanceTemplate(
            studentName,
            session.course,
            session.coordinator?.name || 'Coordinator',
            status,
            new Date().toLocaleDateString(),
            new Date().toLocaleTimeString()
          ),
          recipientType: 'student',
          emailType: 'attendance_scan',
          metadata: {
            sessionId: session._id,
            studentId: student._id || student.studentId?._id,
            department: student.department,
            scanStatus: status.toLowerCase(),
            scanTime: new Date()
          }
        };
      });

      // Add all scan emails to queue for efficient processing
      emailQueue.sendMultiple(scanEmails);

      return {
        success: true,
        totalNotified: scanEmails.length,
        presentCount: presentStudents.length,
        absentCount: absentStudents.length
      };
    } catch (error) {
      console.error('Error sending scan notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send session creation notifications to students
  async sendSessionCreationNotifications(sessionId) {
    try {
      const session = await Session.findById(sessionId).populate('coordinator');
      if (!session) {
        throw new Error('Session not found');
      }

      const students = await User.find({ department: { $in: session.departments } });
      const coordinator = session.coordinator;

      // Prepare student emails for queue
      const studentEmails = students.map(student => ({
        to: student.email,
        subject: `New Session Created - ${session.course}`,
        text: emailService.getStudentAttendanceTemplate(
          student.name,
          session.course,
          coordinator.name,
          'Session Created',
          session.date.toLocaleDateString(),
          `${session.startTime} - ${session.endTime}`
        ),
        recipientType: 'student',
        emailType: 'session_created',
        metadata: {
          sessionId: sessionId,
          studentId: student._id,
          department: student.department
        }
      }));

      // Prepare coordinator email
      const coordinatorEmail = {
        to: coordinator.email,
        subject: `Session Created Successfully - ${session.course}`,
        html: emailService.getCoordinatorSessionTemplate(
          coordinator.name,
          session.course,
          session.departments.join(', '),
          session.date.toLocaleDateString(),
          `${session.startTime} - ${session.endTime}`,
          students
        ),
        recipientType: 'coordinator',
        emailType: 'session_created',
        metadata: {
          sessionId: sessionId,
          coordinatorId: coordinator._id
        }
      };

      // Add all emails to queue for efficient processing
      emailQueue.sendMultiple([...studentEmails, coordinatorEmail]);

      // Send SMS notifications asynchronously
      setImmediate(async () => {
        try {
          const smsResult = await smsController.sendSessionCreationSMS(sessionId);
          console.log('Session creation SMS sent:', smsResult);
        } catch (smsError) {
          console.error('Error sending session creation SMS:', smsError);
        }
      });

      return {
        success: true,
        studentsNotified: studentEmails.length,
        studentsSkipped: 0,
        studentsFailed: 0,
        coordinatorNotified: true,
        results: studentEmails.map(email => ({
          studentId: email.metadata.studentId,
          email: email.to,
          success: true,
          skipped: false,
          reason: null,
          queued: true
        }))
      };
    } catch (error) {
      console.error('Error sending session creation notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send weekly attendance summaries
  async sendWeeklySummaries() {
    try {
      const results = {
        students: { sent: 0, failed: 0, skipped: 0 },
        coordinators: { sent: 0, failed: 0, skipped: 0 }
      };

      // Send to students
      const students = await User.find({});
      for (const student of students) {
        try {
          const preference = await EmailPreference.findOne({
            userId: student._id,
            userType: 'User',
            isActive: true
          });

          if (!preference || !preference.preferences.weeklySummaries) {
            results.students.skipped++;
            continue;
          }

          // Calculate weekly attendance data
          const weekData = await this.calculateWeeklyStudentData(student._id);
          
          const subject = `Weekly Attendance Summary - ${new Date().toLocaleDateString()}`;
          const text = emailService.getStudentWeeklyTemplate(student.name, weekData);

          const result = await emailService.sendEmail(student.email, subject, text);

          await EmailLog.create({
            recipient: student.email,
            recipientType: 'student',
            emailType: 'weekly_summary',
            subject: subject,
            content: text,
            status: result.success ? 'sent' : 'failed',
            messageId: result.success ? result.messageId : null,
            error: result.success ? null : result.error,
            metadata: {
              studentId: student._id,
              department: student.department,
              attendanceData: weekData
            },
            sentAt: result.success ? new Date() : null
          });

          if (result.success) {
            results.students.sent++;
          } else {
            results.students.failed++;
          }

          // Check for low attendance
          if (weekData.attendanceRate < preference.lowAttendanceThreshold && 
              preference.preferences.lowAttendanceAlerts) {
            await this.sendLowAttendanceAlert(student._id, weekData);
          }

        } catch (error) {
          results.students.failed++;
          console.error(`Error sending weekly summary to student ${student._id}:`, error);
        }
      }

      // Send to coordinators
      const coordinators = await Coordinator.find({});
      for (const coordinator of coordinators) {
        try {
          const preference = await EmailPreference.findOne({
            userId: coordinator._id,
            userType: 'Coordinator',
            isActive: true
          });

          if (!preference || !preference.preferences.weeklySummaries) {
            results.coordinators.skipped++;
            continue;
          }

          const weekData = await this.calculateWeeklyCoordinatorData(coordinator._id);
          
          const subject = `Weekly Attendance Report - ${new Date().toLocaleDateString()}`;
          const html = emailService.getCoordinatorWeeklyTemplate(coordinator.name, weekData);

          const result = await emailService.sendEmail(coordinator.email, subject, null, html);

          await EmailLog.create({
            recipient: coordinator.email,
            recipientType: 'coordinator',
            emailType: 'weekly_summary',
            subject: subject,
            content: html,
            status: result.success ? 'sent' : 'failed',
            messageId: result.success ? result.messageId : null,
            error: result.success ? null : result.error,
            metadata: {
              coordinatorId: coordinator._id,
              attendanceData: weekData
            },
            sentAt: result.success ? new Date() : null
          });

          if (result.success) {
            results.coordinators.sent++;
          } else {
            results.coordinators.failed++;
          }

        } catch (error) {
          results.coordinators.failed++;
          console.error(`Error sending weekly summary to coordinator ${coordinator._id}:`, error);
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error('Error sending weekly summaries:', error);
      return { success: false, error: error.message };
    }
  }

  // Send low attendance alert
  async sendLowAttendanceAlert(studentId, attendanceData) {
    try {
      const student = await User.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      const preference = await EmailPreference.findOne({
        userId: studentId,
        userType: 'User',
        isActive: true
      });

      if (!preference || !preference.preferences.lowAttendanceAlerts) {
        return { success: true, skipped: true, reason: 'Low attendance alerts disabled' };
      }

      const subject = `URGENT: Low Attendance Alert - ${attendanceData.attendanceRate}%`;
      const text = emailService.getLowAttendanceTemplate(student.name, attendanceData.attendanceRate, attendanceData.courses);

      const result = await emailService.sendEmail(student.email, subject, text);

      await EmailLog.create({
        recipient: student.email,
        recipientType: 'student',
        emailType: 'low_attendance_alert',
        subject: subject,
        content: text,
        status: result.success ? 'sent' : 'failed',
        messageId: result.success ? result.messageId : null,
        error: result.success ? null : result.error,
        metadata: {
          studentId: studentId,
          department: student.department,
          attendanceData: attendanceData
        },
        sentAt: result.success ? new Date() : null
      });

      return result;
    } catch (error) {
      console.error('Error sending low attendance alert:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate weekly student data
  async calculateWeeklyStudentData(studentId) {
    // This would calculate attendance data for the week
    // For now, return mock data
    return {
      totalSessions: 5,
      presentSessions: 3,
      attendanceRate: 60,
      courses: [
        { name: 'Computer Science', present: 2, total: 3, rate: 67 },
        { name: 'Mathematics', present: 1, total: 2, rate: 50 }
      ]
    };
  }

  // Calculate weekly coordinator data
  async calculateWeeklyCoordinatorData(coordinatorId) {
    // This would calculate attendance data for the coordinator's departments
    // For now, return mock data
    return {
      totalSessions: 15,
      totalStudents: 45,
      avgAttendance: 78,
      departments: [
        { name: 'Computer Science', sessions: 8, students: 25, avgAttendance: 82 },
        { name: 'Mathematics', sessions: 7, students: 20, avgAttendance: 74 }
      ]
    };
  }

  // Get email logs
  async getEmailLogs(filters = {}) {
    try {
      const query = {};
      
      if (filters.recipientType) {
        query.recipientType = filters.recipientType;
      }
      
      if (filters.emailType) {
        query.emailType = filters.emailType;
      }
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      const logs = await EmailLog.find(query)
        .populate('metadata.sessionId')
        .populate('metadata.studentId')
        .populate('metadata.coordinator')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);

      return { success: true, logs };
    } catch (error) {
      console.error('Error getting email logs:', error);
      return { success: false, error: error.message };
    }
  }

  // Update email preferences
  async updateEmailPreferences(userId, userType, preferences) {
    try {
      const updated = await EmailPreference.findOneAndUpdate(
        { userId, userType },
        { 
          $set: { 
            ...preferences,
            updatedAt: Date.now()
          }
        },
        { upsert: true, new: true }
      );

      return { success: true, preferences: updated };
    } catch (error) {
      console.error('Error updating email preferences:', error);
      return { success: false, error: error.message };
    }
  }

  // Get email preferences
  async getEmailPreferences(userId, userType) {
    try {
      const preferences = await EmailPreference.findOne({ userId, userType });
      
      if (!preferences) {
        // Create default preferences
        const user = userType === 'User' ? 
          await User.findById(userId) : 
          await Coordinator.findById(userId);
        
        if (user) {
          const defaultPrefs = await EmailPreference.create({
            userId,
            userType,
            email: user.email
          });
          return { success: true, preferences: defaultPrefs };
        }
      }

      return { success: true, preferences };
    } catch (error) {
      console.error('Error getting email preferences:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailController();
