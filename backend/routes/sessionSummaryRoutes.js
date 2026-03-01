const express = require('express');
const router = express.Router();
const {
  getSessionSummaries,
  getSessionSummary,
  getAttendanceStats,
} = require('../controllers/sessionSummaryController');
const verifyCoordinator = require('../middleware/auth');

// Protect all routes
router.use(verifyCoordinator);

// GET /api/session-summaries - Get all session summaries for coordinator
router.get('/', getSessionSummaries);

// GET /api/session-summaries/stats - Get attendance statistics
router.get('/stats', getAttendanceStats);

// GET /api/session-summaries/:id - Get single session summary
router.get('/:id', getSessionSummary);

module.exports = router;
