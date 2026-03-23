const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,   
        required: true,
        unique: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    macAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        required: false,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return true; // Phone is optional
                // Accept Cameroon numbers: local format (6-9 digits) or international format
                const localCameroon = /^[6-9]\d{8}$/; // 9 digits starting with 6-9
                const internationalFormat = /^\+237[6-9]\d{8}$/; // +237 + 9 digits
                return localCameroon.test(v) || internationalFormat.test(v);
            },
            message: 'Invalid Cameroon phone number. Use local format (e.g., 612345678) or international format (+237612345678)'
        }
    },
    phoneNumber: {
        type: String,
        required: false,
        trim: true
    },
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        sessionCreationSMS: { type: Boolean, default: true },
        attendanceSMS: { type: Boolean, default: true },
        sessionEndSMS: { type: Boolean, default: true }
    }
});

// Format phone number before saving
userSchema.pre('save', function(next) {
    // Handle phone field
    if (this.phone) {
        // Convert local Cameroon number to international format
        if (!this.phone.startsWith('+')) {
            this.phone = '+237' + this.phone;
        }
    }
    
    // Handle phoneNumber field (for backward compatibility)
    if (this.phoneNumber) {
        // Convert local Cameroon number to international format
        if (!this.phoneNumber.startsWith('+')) {
            this.phoneNumber = '+237' + this.phoneNumber;
        }
    }
    
    // Sync phone and phoneNumber fields
    if (this.phone && !this.phoneNumber) {
        this.phoneNumber = this.phone;
    } else if (this.phoneNumber && !this.phone) {
        this.phone = this.phoneNumber;
    }
    
    next();
});

module.exports = mongoose.model('User', userSchema);