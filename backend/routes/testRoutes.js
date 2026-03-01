const express = require('express');
const router = express.Router();
const { createSessionSummary } = require('../controllers/sessionSummaryController');
const verifyCoordinator = require('../middleware/auth');

// Create test summary for existing session
router.post('/test-create/:sessionId', verifyCoordinator, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const summary = await createSessionSummary(sessionId);
    
    if (summary) {
      res.json({
        success: true,
        message: 'Test session summary created successfully',
        summary
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Session not found or no attendance data'
      });
    }
  } catch (error) {
    console.error('Error creating test summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test summary',
      error: error.message
    });
  }
});

module.exports = router;
