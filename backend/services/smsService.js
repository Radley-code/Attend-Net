const twilio = require('twilio');

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = null;
    this.isConfigured = false;
    this.initializeTwilio();
  }

  initializeTwilio() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !phoneNumber) {
        console.log('Twilio credentials not found in environment variables');
        return;
      }

      this.client = twilio(accountSid, authToken);
      this.fromNumber = phoneNumber;
      this.isConfigured = true;
      console.log('Twilio SMS service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio:', error.message);
    }
  }

  async sendSMS(to, message) {
    try {
      if (!this.isConfigured) {
        return { 
          success: false, 
          error: 'Twilio not configured. Check environment variables.' 
        };
      }

      if (!to || !message) {
        return { 
          success: false, 
          error: 'Phone number and message are required' 
        };
      }

      // Format phone number
      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedTo
      });
      
      console.log(`SMS sent successfully to ${formattedTo}: ${result.sid}`);
      return { 
        success: true, 
        messageId: result.sid,
        to: formattedTo,
        from: this.fromNumber,
        status: result.status
      };
    } catch (error) {
      console.error('SMS sending failed:', error.message);
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, assume Cameroon number and add +237
    if (!cleaned.startsWith('+')) {
      // Remove any leading zeros and ensure it's a valid Cameroon number
      cleaned = cleaned.replace(/^0+/, '');
      if (/^[6-9]\d{8}$/.test(cleaned)) {
        cleaned = '+237' + cleaned;
      } else {
        // If it's not a valid Cameroon number, try to format as international
        if (cleaned.length === 9 && /^[6-9]/.test(cleaned)) {
          cleaned = '+237' + cleaned;
        } else if (cleaned.length === 12 && !cleaned.startsWith('+')) {
          cleaned = '+' + cleaned;
        }
      }
    }
    
    return cleaned;
  }

  async testConnection() {
    try {
      if (!this.isConfigured) {
        return { success: false, error: 'Twilio not configured' };
      }

      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      console.log('Twilio connection successful:', account.friendlyName);
      return { 
        success: true, 
        account: account.friendlyName,
        phoneNumber: this.fromNumber
      };
    } catch (error) {
      console.error('Twilio connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendBatchSMS(messages) {
    const results = [];
    
    for (const sms of messages) {
      try {
        const result = await this.sendSMS(sms.to, sms.message);
        results.push({
          to: sms.to,
          success: result.success,
          messageId: result.success ? result.messageId : null,
          error: result.success ? null : result.error
        });
        
        // Add small delay between messages to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        results.push({
          to: sms.to,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get service status
  getStatus() {
    return {
      configured: this.isConfigured,
      phoneNumber: this.fromNumber,
      provider: 'Twilio'
    };
  }
}

module.exports = new SMSService();
