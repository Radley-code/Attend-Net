const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const emailService = require('../services/emailService');
const EmailLog = require('../models/emailLog');
const verifyCoordinator = require('../middleware/auth');

// Send attendance notification (internal use)
router.post('/attendance-notification', async (req, res) => {
  try {
    const { studentId, sessionId, status } = req.body;
    
    if (!studentId || !sessionId || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student ID, session ID, and status are required' 
      });
    }

    const result = await emailController.sendAttendanceNotification(studentId, sessionId, status);
    res.json(result);
  } catch (error) {
    console.error('Error in attendance notification route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send session creation notifications (internal use)
router.post('/session-creation/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await emailController.sendSessionCreationNotifications(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error in session creation notifications route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send weekly summaries (internal use)
router.post('/weekly-summaries', async (req, res) => {
  try {
    const result = await emailController.sendWeeklySummaries();
    res.json(result);
  } catch (error) {
    console.error('Error in weekly summaries route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get email logs (coordinator only)
router.get('/logs', verifyCoordinator, async (req, res) => {
  try {
    const filters = {
      recipientType: req.query.recipientType,
      emailType: req.query.emailType,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      limit: parseInt(req.query.limit) || 50
    };

    const result = await emailController.getEmailLogs(filters);
    res.json(result);
  } catch (error) {
    console.error('Error in email logs route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update email preferences
router.put('/preferences', async (req, res) => {
  try {
    const { userId, userType, preferences } = req.body;
    
    if (!userId || !userType || !preferences) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID, user type, and preferences are required' 
      });
    }

    const result = await emailController.updateEmailPreferences(userId, userType, preferences);
    res.json(result);
  } catch (error) {
    console.error('Error in update preferences route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get email preferences
router.get('/preferences', async (req, res) => {
  try {
    const { userId, userType } = req.query;
    
    if (!userId || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and user type are required' 
      });
    }

    const result = await emailController.getEmailPreferences(userId, userType);
    res.json(result);
  } catch (error) {
    console.error('Error in get preferences route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Preview email (coordinator only)
router.post('/preview', verifyCoordinator, async (req, res) => {
  try {
    const { emailType, recipientType, data } = req.body;
    
    if (!emailType || !recipientType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email type and recipient type are required' 
      });
    }

    // Generate preview based on type
    let preview = '';
    
    if (recipientType === 'student') {
      switch (emailType) {
        case 'attendance_notification':
          preview = emailService.getStudentAttendanceTemplate(
            data.studentName || 'John Doe',
            data.courseName || 'Sample Course',
            data.coordinatorName || 'Dr. Smith',
            data.status || 'present',
            data.date || new Date().toLocaleDateString(),
            data.time || new Date().toLocaleTimeString()
          );
          break;
        case 'weekly_summary':
          preview = emailService.getStudentWeeklyTemplate(
            data.studentName || 'John Doe',
            data.attendanceData || {
              totalSessions: 5,
              presentSessions: 4,
              attendanceRate: 80,
              courses: [{ name: 'Sample Course', present: 4, total: 5, rate: 80 }]
            }
          );
          break;
        case 'low_attendance_alert':
          preview = emailService.getLowAttendanceTemplate(
            data.studentName || 'John Doe',
            data.attendanceRate || 45,
            data.courses || [{ name: 'Sample Course', rate: 45 }]
          );
          break;
      }
    } else if (recipientType === 'coordinator') {
      switch (emailType) {
        case 'session_created':
          preview = emailService.getCoordinatorSessionTemplate(
            data.coordinatorName || 'Dr. Smith',
            data.courseName || 'Sample Course',
            data.department || 'Computer Science',
            data.date || new Date().toLocaleDateString(),
            data.time || new Date().toLocaleTimeString(),
            data.students || [{ name: 'John Doe', email: 'john@example.com' }]
          );
          break;
        case 'weekly_summary':
          preview = emailService.getCoordinatorWeeklyTemplate(
            data.coordinatorName || 'Dr. Smith',
            data.weekData || {
              totalSessions: 15,
              totalStudents: 45,
              avgAttendance: 78,
              departments: [
                { name: 'Computer Science', sessions: 8, students: 25, avgAttendance: 82 },
                { name: 'Mathematics', sessions: 7, students: 20, avgAttendance: 74 }
              ]
            }
          );
          break;
      }
    }

    res.json({ 
      success: true, 
      preview: preview,
      emailType,
      recipientType
    });
  } catch (error) {
    console.error('Error in preview email route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send test email (coordinator only)
router.post('/test', verifyCoordinator, async (req, res) => {
  try {
    const { email, emailType, recipientType } = req.body;
    
    if (!email || !emailType || !recipientType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, email type, and recipient type are required' 
      });
    }

    // Generate test email content
    let subject = '';
    let content = '';
    let html = null;
    
    if (recipientType === 'student') {
      subject = `Test Email - ${emailType}`;
      content = emailService.getStudentAttendanceTemplate(
        'Test Student',
        'Test Course',
        'Test Coordinator',
        'present',
        new Date().toLocaleDateString(),
        new Date().toLocaleTimeString()
      );
    } else if (recipientType === 'coordinator') {
      subject = `Test Email - ${emailType}`;
      html = emailService.getCoordinatorSessionTemplate(
        'Test Coordinator',
        'Test Course',
        'Test Department',
        new Date().toLocaleDateString(),
        new Date().toLocaleTimeString(),
        [{ name: 'Test Student', email: 'test@example.com' }]
      );
    }

    const result = await emailService.sendEmail(email, subject, content, html);
    
    // Log the test email
    await EmailLog.create({
      recipient: email,
      recipientType: recipientType,
      emailType: 'test',
      subject: subject,
      content: content || html,
      status: result.success ? 'sent' : 'failed',
      messageId: result.success ? result.messageId : null,
      error: result.success ? null : result.error,
      sentAt: result.success ? new Date() : null
    });

    res.json(result);
  } catch (error) {
    console.error('Error in test email route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
