const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  recipient: { 
    type: String, 
    required: true,
    trim: true
  },
  recipientType: { 
    type: String, 
    enum: ['student', 'coordinator'], 
    required: true 
  },
  smsType: { 
    type: String, 
    enum: ['session_created', 'attendance_scan', 'session_ended', 'test'],
    required: true 
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 1600 // SMS character limit
  },
  status: { 
    type: String, 
    enum: ['sent', 'failed', 'pending'], 
    required: true,
    default: 'pending'
  },
  messageId: { 
    type: String, 
    sparse: true // Only create index for non-null values
  },
  twilioSid: { 
    type: String, 
    sparse: true
  },
  error: { 
    type: String 
  },
  errorCode: { 
    type: String 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed 
  },
  sentAt: { 
    type: Date 
  },
  deliveredAt: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
smsLogSchema.index({ recipient: 1, createdAt: -1 });
smsLogSchema.index({ smsType: 1, status: 1 });
smsLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SMSLog', smsLogSchema);
