const express = require("express");
const router = express.Router();
const verifyCoordinator = require("../middleware/auth");

const { createSession } = require("../controllers/sessionControllers");

// Route to create a new session
router.post("/create", verifyCoordinator, createSession);
module.exports = router;
