const express = require('express');
const router = express.Router();

const { registerStudent } = require('../controllers/userController');

// Route to register a new student
router.post('/register', registerStudent);
module.exports = router;