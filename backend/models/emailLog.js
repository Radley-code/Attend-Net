const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true
    },
    recipientType: {
        type: String,
        enum: ['student', 'coordinator'],
        required: true
    },
    emailType: {
        type: String,
        enum: ['attendance_notification', 'attendance_scan', 'weekly_summary', 'low_attendance_alert', 'session_created', 'session_summary'],
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    },
    messageId: {
        type: String,
        default: null
    },
    error: {
        type: String,
        default: null
    },
    metadata: {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Session',
            default: null
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        coordinatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coordinator',
            default: null
        },
        department: {
            type: String,
            default: null
        },
        attendanceData: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    sentAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

emailLogSchema.index({ recipient: 1, emailType: 1 });
emailLogSchema.index({ status: 1 });
emailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
