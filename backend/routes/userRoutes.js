const express = require("express");
const router = express.Router();

const {
  registerStudent,
  getAllDepartments,
  detectMacAddress,
  debugRouterConnection,
} = require("../controllers/userController");

// Route to register a new student
router.post("/register", registerStudent);

// Route to get all departments from registered students
router.get("/departments", getAllDepartments);

// Route to detect MAC address for current client
router.get("/detect-mac", detectMacAddress);

// Debug route to test router connection
router.get("/debug-router", debugRouterConnection);

module.exports = router;
