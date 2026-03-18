const emailService = require('./emailService');
const EmailLog = require('../models/emailLog');

class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchSize = 10; // Process emails in batches
    this.batchDelay = 1000; // 1 second delay between batches
  }

  // Add email to queue
  add(emailData) {
    this.queue.push({
      ...emailData,
      timestamp: new Date(),
      retries: 0,
      maxRetries: 3
    });
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  // Process email queue
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      // Process batch in parallel
      await Promise.all(batch.map(emailData => this.processEmail(emailData)));
      
      // Add delay between batches to avoid overwhelming the email service
      if (this.queue.length > 0) {
        await this.delay(this.batchDelay);
      }
    }

    this.processing = false;
  }

  // Process individual email
  async processEmail(emailData) {
    try {
      // Validate email data before processing
      if (!emailData.to) {
        console.error('Email data missing recipient:', emailData);
        return;
      }

      const result = await emailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.text,
        emailData.html,
        emailData.attachments
      );

      // Log the email
      await EmailLog.create({
        recipient: emailData.to,
        recipientType: emailData.recipientType,
        emailType: emailData.emailType,
        subject: emailData.subject,
        content: emailData.text || emailData.html,
        status: result.success ? 'sent' : 'failed',
        messageId: result.success ? result.messageId : null,
        error: result.success ? null : result.error,
        metadata: emailData.metadata,
        sentAt: result.success ? new Date() : null
      });

      console.log(`Email ${result.success ? 'sent' : 'failed'} to ${emailData.to}:`, result.messageId || result.error);

    } catch (error) {
      console.error(`Error processing email to ${emailData.to}:`, error);
      
      // Retry logic
      if (emailData.retries < emailData.maxRetries) {
        emailData.retries++;
        this.queue.push(emailData);
        console.log(`Retrying email to ${emailData.to} (attempt ${emailData.retries}/${emailData.maxRetries})`);
      } else {
        // Log failed email after max retries
        await EmailLog.create({
          recipient: emailData.to || 'unknown',
          recipientType: emailData.recipientType,
          emailType: emailData.emailType,
          subject: emailData.subject,
          content: emailData.text || emailData.html,
          status: 'failed',
          error: `Max retries exceeded: ${error.message}`,
          metadata: emailData.metadata
        });
      }
    }
  }

  // Send multiple emails efficiently
  sendMultiple(emails) {
    emails.forEach(email => this.add(email));
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing
    };
  }

  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new EmailQueue();
