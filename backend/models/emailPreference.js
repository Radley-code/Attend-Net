const mongoose = require('mongoose');

const emailPreferenceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userType'
    },
    userType: {
        type: String,
        enum: ['User', 'Coordinator'],
        required: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    preferences: {
        attendanceNotifications: {
            type: Boolean,
            default: true
        },
        weeklySummaries: {
            type: Boolean,
            default: true
        },
        lowAttendanceAlerts: {
            type: Boolean,
            default: true
        },
        sessionCreatedNotifications: {
            type: Boolean,
            default: true
        },
        sessionSummaries: {
            type: Boolean,
            default: true
        }
    },
    lowAttendanceThreshold: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },
    weeklyEmailDay: {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        default: 'sunday'
    },
    weeklyEmailTime: {
        type: String,
        default: '09:00'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastEmailSent: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

emailPreferenceSchema.index({ userId: 1, userType: 1 });
emailPreferenceSchema.index({ email: 1 });
emailPreferenceSchema.index({ isActive: 1 });

emailPreferenceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('EmailPreference', emailPreferenceSchema);
