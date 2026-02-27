const express = require("express");
const router = express.Router();
const verifyCoordinator = require("../middleware/auth");

const {
  createSession,
  getSessionsForCoordinator,
} = require("../controllers/sessionControllers");

// Route to create a new session
router.post("/create", verifyCoordinator, createSession);

// get sessions for currently logged in coordinator
router.get("/mine", verifyCoordinator, getSessionsForCoordinator);

module.exports = router;
