const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Create transporter with Gmail SMTP
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        },
        // Fix SSL certificate and socket issues
        tls: {
          rejectUnauthorized: false
        },
        secure: true,
        // Add connection pooling and timeout settings
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.log('Email service connection error:', error);
        } else {
          console.log('Email service is ready to send messages');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(to, subject, text, html = null, attachments = []) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        text: text,
        html: html,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Handle specific socket errors
      if (error.code === 'ESOCKET' || error.message.includes('socket close')) {
        console.log('Socket error detected, attempting to reconnect...');
        this.initializeTransporter();
      }
      
      return { success: false, error: error.message };
    }
  }

  // Student email templates (plain text)
  getStudentAttendanceTemplate(studentName, courseName, coordinatorName, status, date, time) {
    return `
Dear ${studentName},

ATTENDANCE NOTIFICATION - ${courseName}

Course: ${courseName}
Coordinator: ${coordinatorName}
Date: ${date}
Time: ${time}
Status: ${status.toUpperCase()}

This is an automated notification about your attendance in the ${courseName} session.

If you believe this is an error, please contact your coordinator immediately.

Best regards,
AttendNet System
    `.trim();
  }

  // Session end summary template
  getSessionEndSummaryTemplate(studentName, courseName, coordinatorName, date, startTime, endTime, attendanceRate, finalStatus) {
    return `
Dear ${studentName},

SESSION ENDED - ${courseName}

Course: ${courseName}
Coordinator: ${coordinatorName}
Date: ${date}
Session Time: ${startTime} - ${endTime}
Final Status: ${finalStatus.toUpperCase()}
Your Attendance Rate: ${attendanceRate.toFixed(1)}%

This session has officially ended. Your attendance has been recorded and this is your final summary.

If you believe this is an error, please contact your coordinator immediately.

Best regards,
AttendNet System
    `.trim();
  }

  getStudentWeeklyTemplate(studentName, attendanceData) {
    const { totalSessions, presentSessions, attendanceRate, courses } = attendanceData;
    
    return `
Dear ${studentName},

WEEKLY ATTENDANCE SUMMARY

Total Sessions This Week: ${totalSessions}
Sessions Attended: ${presentSessions}
Attendance Rate: ${attendanceRate}%

Course Breakdown:
${courses.map(course => `- ${course.name}: ${course.present}/${course.total} (${course.rate}%)`).join('\n')}

${attendanceRate < 50 ? 'WARNING: Your attendance rate is below 50%. Please improve your attendance.' : ''}

Keep up the good work!

Best regards,
AttendNet System
    `.trim();
  }

  getLowAttendanceTemplate(studentName, attendanceRate, courses) {
    return `
URGENT: LOW ATTENDANCE ALERT

Dear ${studentName},

Your current attendance rate is ${attendanceRate}%, which is below the required 50%.

Current Status:
${courses.map(course => `- ${course.name}: ${course.rate}% attendance`).join('\n')}

Please note that low attendance may affect your academic standing. We recommend attending all upcoming sessions.

If you have any questions or concerns, please contact your coordinator immediately.

Best regards,
AttendNet System
    `.trim();
  }

  // Coordinator email templates (HTML)
  getCoordinatorSessionTemplate(coordinatorName, courseName, department, date, time, students) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Session Created - ${courseName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .content { margin-bottom: 30px; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Session Created Successfully</h1>
            <p>AttendNet Attendance System</p>
        </div>
        
        <div class="content">
            <h2>Session Details</h2>
            <div class="info">
                <p><strong>Course:</strong> ${courseName}</p>
                <p><strong>Department:</strong> ${department}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Coordinator:</strong> ${coordinatorName}</p>
            </div>
            
            <h3>Student Notifications</h3>
            <p>Email notifications have been sent to <strong>${students.length}</strong> students from the ${department} department.</p>
            
            <div class="info">
                <p>Students will receive real-time attendance updates during this session.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated message from the AttendNet System</p>
            <p>© 2024 AttendNet - Student Attendance Management</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  getCoordinatorWeeklyTemplate(coordinatorName, weekData) {
    const { totalSessions, totalStudents, avgAttendance, departments } = weekData;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Weekly Attendance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-box { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 5px; min-width: 150px; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #007bff; color: white; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Weekly Attendance Report</h1>
            <p>Coordinator: ${coordinatorName}</p>
            <p>Week of ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="stats">
            <div class="stat-box">
                <div class="stat-number">${totalSessions}</div>
                <div class="stat-label">Total Sessions</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${totalStudents}</div>
                <div class="stat-label">Total Students</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${avgAttendance}%</div>
                <div class="stat-label">Avg Attendance</div>
            </div>
        </div>
        
        <h3>Department Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Sessions</th>
                    <th>Students</th>
                    <th>Avg Attendance</th>
                </tr>
            </thead>
            <tbody>
                ${departments.map(dept => `
                <tr>
                    <td>${dept.name}</td>
                    <td>${dept.sessions}</td>
                    <td>${dept.students}</td>
                    <td>${dept.avgAttendance}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>This is an automated message from the AttendNet System</p>
            <p>© 2024 AttendNet - Student Attendance Management</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }
}

module.exports = new EmailService();
