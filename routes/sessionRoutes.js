const express = require("express");
const router = express.Router();

const { createSession } = require("../controllers/sessionControllers");

// Route to create a new session
router.post("/create", createSession);
module.exports = router;
