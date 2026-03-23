const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Test SMS endpoint
router.post('/test', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and message are required' 
      });
    }

    const result = await smsController.sendTestSMS(to, message);
    
    res.json({
      success: result.success,
      message: result.success ? 'SMS sent successfully' : 'SMS failed',
      data: result
    });
  } catch (error) {
    console.error('SMS test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during SMS test' 
    });
  }
});

// Test Twilio connection
router.get('/test-connection', async (req, res) => {
  try {
    const result = await smsController.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get SMS service status
router.get('/status', async (req, res) => {
  try {
    const status = await smsController.getSMSStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send session creation SMS (for testing)
router.post('/session-created/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await smsController.sendSessionCreationSMS(sessionId);
    
    res.json({
      success: result.success,
      message: result.success ? 'Session creation SMS sent' : 'Failed to send session creation SMS',
      data: result
    });
  } catch (error) {
    console.error('Session creation SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during session creation SMS' 
    });
  }
});

// Send session end SMS (for testing)
router.post('/session-ended/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await smsController.sendSessionEndSMS(sessionId);
    
    res.json({
      success: result.success,
      message: result.success ? 'Session end SMS sent' : 'Failed to send session end SMS',
      data: result
    });
  } catch (error) {
    console.error('Session end SMS error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during session end SMS' 
    });
  }
});

module.exports = router;
