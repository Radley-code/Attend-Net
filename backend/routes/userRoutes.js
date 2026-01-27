const express = require("express");
const router = express.Router();

const {
  registerStudent,
  getAllDepartments,
} = require("../controllers/userController");

// Route to register a new student
router.post("/register", registerStudent);

// Route to get all departments from registered students
router.get("/departments", getAllDepartments);

module.exports = router;
