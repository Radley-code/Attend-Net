const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,ref: 'User',required: true
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,ref: 'Session',required: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,ref: 'Department',required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'], required: true
    },
    timestamp: {
        type: Date,default: Date.now
    }
});

model.exports = mongoose.model('Attendance', attendanceSchema);