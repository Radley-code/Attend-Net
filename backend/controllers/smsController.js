const User = require('../models/user');
const Coordinator = require('../models/coordinator');
const Session = require('../models/session');
const SMSLog = require('../models/smsLog');
const smsService = require('../services/smsService');

class SMSController {
  // Send session creation SMS notifications
  async sendSessionCreationSMS(sessionId) {
    try {
      const session = await Session.findById(sessionId).populate('coordinator');
      if (!session) {
        throw new Error('Session not found');
      }

      console.log('SMS: Session found:', session.course, 'Departments:', session.departments);

      const results = {
        success: true,
        studentsNotified: 0,
        coordinatorsNotified: 0,
        studentsFailed: 0,
        coordinatorsFailed: 0,
        errors: []
      };

      // Send SMS to students
      try {
        // Check for both phone and phoneNumber fields (for backward compatibility)
        const students = await User.find({ 
          department: { $in: session.departments },
          'preferences.smsNotifications': true,
          'preferences.sessionCreationSMS': true,
          $or: [
            { phone: { $exists: true, $ne: '' } },
            { phoneNumber: { $exists: true, $ne: '' } }
          ]
        });

        console.log('SMS: Found students for SMS:', students.length);
        console.log('SMS: Student details:', students.map(s => ({
          name: s.name,
          department: s.department,
          phone: s.phone,
          phoneNumber: s.phoneNumber,
          smsNotifications: s.preferences?.smsNotifications,
          sessionCreationSMS: s.preferences?.sessionCreationSMS
        })));

        if (students.length > 0) {
          // Filter out students without actual phone numbers
          const studentsWithPhones = students.filter(student => 
            (student.phone || student.phoneNumber) && 
            (student.phone || student.phoneNumber).trim() !== ''
          );
          
          console.log('SMS: Students with actual phone numbers:', studentsWithPhones.length);
          
          if (studentsWithPhones.length === 0) {
            console.log('SMS: No students have valid phone numbers');
            return results;
          }
          
          const studentMessages = studentsWithPhones.map(student => ({
            to: student.phone || student.phoneNumber, // Use either field
            message: `AttendNet: New session "${session.course}" created for ${session.date.toLocaleDateString()} from ${session.startTime} to ${session.endTime}. Please attend.`
          }));

          const studentResults = await smsService.sendBatchSMS(studentMessages);
          
          // Log each SMS
          for (let i = 0; i < studentsWithPhones.length; i++) {
            const student = studentsWithPhones[i];
            const result = studentResults[i];
            const phoneNumber = student.phone || student.phoneNumber;
            
            await SMSLog.create({
              recipient: phoneNumber,
              recipientType: 'student',
              smsType: 'session_created',
              message: studentMessages[i].message,
              status: result.success ? 'sent' : 'failed',
              messageId: result.success ? result.messageId : null,
              twilioSid: result.success ? result.messageId : null,
              error: result.success ? null : result.error,
              metadata: {
                sessionId: sessionId,
                studentId: student._id,
                department: student.department,
                courseName: session.course
              },
              sentAt: result.success ? new Date() : null
            });

            if (result.success) {
              results.studentsNotified++;
            } else {
              results.studentsFailed++;
              results.errors.push(`Student ${student.name}: ${result.error}`);
            }
          }
        }
      } catch (studentError) {
        console.error('Error sending SMS to students:', studentError);
        results.errors.push(`Students SMS failed: ${studentError.message}`);
      }

      // Send SMS to coordinator
      try {
        const coordinatorPhone = session.coordinator?.phone || session.coordinator?.phoneNumber;
        console.log('SMS: Checking coordinator:', session.coordinator?.name, 'Phone:', coordinatorPhone);
        console.log('SMS: Coordinator preferences:', session.coordinator?.preferences);
        
        if (session.coordinator && 
            coordinatorPhone && 
            session.coordinator.preferences?.smsNotifications && 
            session.coordinator.preferences?.sessionCreationSMS) {
          
          const coordinatorMessage = `AttendNet: Session "${session.course}" created successfully. ${students.length || 0} students notified. Session: ${session.date.toLocaleDateString()} ${session.startTime}-${session.endTime}.`;
          
          const coordinatorResult = await smsService.sendSMS(coordinatorPhone, coordinatorMessage);
          
          await SMSLog.create({
            recipient: coordinatorPhone,
            recipientType: 'coordinator',
            smsType: 'session_created',
            message: coordinatorMessage,
            status: coordinatorResult.success ? 'sent' : 'failed',
            messageId: coordinatorResult.success ? coordinatorResult.messageId : null,
            twilioSid: coordinatorResult.success ? coordinatorResult.messageId : null,
            error: coordinatorResult.success ? null : coordinatorResult.error,
            metadata: {
              sessionId: sessionId,
              coordinatorId: session.coordinator._id,
              courseName: session.course
            },
            sentAt: coordinatorResult.success ? new Date() : null
          });

          if (coordinatorResult.success) {
            results.coordinatorsNotified++;
          } else {
            results.coordinatorsFailed++;
            results.errors.push(`Coordinator ${session.coordinator.name}: ${coordinatorResult.error}`);
          }
        } else {
          console.log('SMS: Coordinator not eligible for SMS - missing phone or preferences');
        }
      } catch (coordinatorError) {
        console.error('Error sending SMS to coordinator:', coordinatorError);
        results.errors.push(`Coordinator SMS failed: ${coordinatorError.message}`);
      }

      console.log(`Session creation SMS sent: ${results.studentsNotified} students, ${results.coordinatorsNotified} coordinators`);
      return results;
    } catch (error) {
      console.error('Error sending session creation SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Send session end SMS notifications
  async sendSessionEndSMS(sessionId) {
    try {
      const session = await Session.findById(sessionId).populate('coordinator');
      if (!session) {
        throw new Error('Session not found');
      }

      const results = {
        success: true,
        studentsNotified: 0,
        coordinatorsNotified: 0,
        studentsFailed: 0,
        coordinatorsFailed: 0,
        errors: []
      };

      // Send SMS to students
      try {
        // Check for both phone and phoneNumber fields (for backward compatibility)
        const students = await User.find({ 
          department: { $in: session.departments },
          'preferences.smsNotifications': true,
          'preferences.sessionEndSMS': true,
          $or: [
            { phone: { $exists: true, $ne: '' } },
            { phoneNumber: { $exists: true, $ne: '' } }
          ]
        });

        if (students.length > 0) {
          const studentMessages = students.map(student => ({
            to: student.phone || student.phoneNumber, // Use either field
            message: `AttendNet: Session "${session.course}" has ended. Thank you for attending. Check your email for detailed attendance summary.`
          }));

          const studentResults = await smsService.sendBatchSMS(studentMessages);
          
          // Log each SMS
          for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const result = studentResults[i];
            const phoneNumber = student.phone || student.phoneNumber;
            
            await SMSLog.create({
              recipient: phoneNumber,
              recipientType: 'student',
              smsType: 'session_ended',
              message: studentMessages[i].message,
              status: result.success ? 'sent' : 'failed',
              messageId: result.success ? result.messageId : null,
              twilioSid: result.success ? result.messageId : null,
              error: result.success ? null : result.error,
              metadata: {
                sessionId: sessionId,
                studentId: student._id,
                department: student.department,
                courseName: session.course
              },
              sentAt: result.success ? new Date() : null
            });

            if (result.success) {
              results.studentsNotified++;
            } else {
              results.studentsFailed++;
              results.errors.push(`Student ${student.name}: ${result.error}`);
            }
          }
        }
      } catch (studentError) {
        console.error('Error sending session end SMS to students:', studentError);
        results.errors.push(`Students SMS failed: ${studentError.message}`);
      }

      // Send SMS to coordinator
      try {
        const coordinatorPhone = session.coordinator?.phone || session.coordinator?.phoneNumber;
        
        if (session.coordinator && 
            coordinatorPhone && 
            session.coordinator.preferences?.smsNotifications && 
            session.coordinator.preferences?.sessionEndSMS) {
          
          const coordinatorMessage = `AttendNet: Session "${session.course}" has ended. ${students.length || 0} students were notified. Session summary emails have been sent.`;
          
          const coordinatorResult = await smsService.sendSMS(coordinatorPhone, coordinatorMessage);
          
          await SMSLog.create({
            recipient: coordinatorPhone,
            recipientType: 'coordinator',
            smsType: 'session_ended',
            message: coordinatorMessage,
            status: coordinatorResult.success ? 'sent' : 'failed',
            messageId: coordinatorResult.success ? coordinatorResult.messageId : null,
            twilioSid: coordinatorResult.success ? coordinatorResult.messageId : null,
            error: coordinatorResult.success ? null : coordinatorResult.error,
            metadata: {
              sessionId: sessionId,
              coordinatorId: session.coordinator._id,
              courseName: session.course
            },
            sentAt: coordinatorResult.success ? new Date() : null
          });

          if (coordinatorResult.success) {
            results.coordinatorsNotified++;
          } else {
            results.coordinatorsFailed++;
            results.errors.push(`Coordinator ${session.coordinator.name}: ${coordinatorResult.error}`);
          }
        }
      } catch (coordinatorError) {
        console.error('Error sending session end SMS to coordinator:', coordinatorError);
        results.errors.push(`Coordinator SMS failed: ${coordinatorError.message}`);
      }

      console.log(`Session end SMS sent: ${results.studentsNotified} students, ${results.coordinatorsNotified} coordinators`);
      return results;
    } catch (error) {
      console.error('Error sending session end SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Test SMS functionality
  async sendTestSMS(to, message) {
    try {
      const result = await smsService.sendSMS(to, message);
      
      await SMSLog.create({
        recipient: to,
        recipientType: 'test',
        smsType: 'test',
        message: message,
        status: result.success ? 'sent' : 'failed',
        messageId: result.success ? result.messageId : null,
        twilioSid: result.success ? result.messageId : null,
        error: result.success ? null : result.error,
        metadata: { test: true },
        sentAt: result.success ? new Date() : null
      });

      return result;
    } catch (error) {
      console.error('Error sending test SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Get SMS service status
  async getSMSStatus() {
    return smsService.getStatus();
  }

  // Test Twilio connection
  async testConnection() {
    return await smsService.testConnection();
  }
}

module.exports = new SMSController();
