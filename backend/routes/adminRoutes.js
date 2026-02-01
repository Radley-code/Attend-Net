const express = require("express");
const router = express.Router();
const Admin = require("../models/admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Coordinator = require("../models/coordinator");
const verifyAdmin = require("../middleware/verifyAdmin");
const User = require("../models/user");


// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Error logging in admin" });
  }
});




// Admin creates coordinator

// Create coordinator endpoint
router.post("/create", verifyAdmin, async (req, res) => {
  try {
    const { name, email, password, department } = req.body;
    if (!name || !email || !password || !department) {
      return res
        .status(400)
        .json({ message: "Name, email, department and password required" });
    }

    const existing = await Coordinator.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Coordinator with this email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const coordinator = new Coordinator({
      name,
      email,
      password: hashed,
      department,
    });

    await coordinator.save();
    return res.status(201).json({
      message: "Coordinator created successfully",
      coordinator: {
        id: coordinator._id,
        name,
        email,
        department,
      },
    });
  } catch (err) {
    console.error("Create coordinator error:", err);
    return res
      .status(500)
      .json({ message: "Server error creating coordinator" });
  }
});

// Get all registered students
router.get("/students", verifyAdmin, async (req, res) => {
  try {
    const students = await User.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Error fetching students" });
  }
});

// Get all coordinators
router.get("/coordinators", verifyAdmin, async (req, res) => {
  try {
    const coordinators = await Coordinator.find().sort({ createdAt: -1 });
    res.json(coordinators);
  }
    catch (err) {
    res.status(500).json({ message: "Error fetching coordinators" });
  }
});

// Get student by ID
router.get("/students/:id", verifyAdmin, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Error fetching student" });
  }
});

//Edit student by ID
router.put("/students/:id", verifyAdmin, async (req, res) => {
  try {
    const { name, email, department } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, department },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Student not found" });

    res.json({ message: "Student updated successfully", updated });
  } catch (err) {
    res.status(500).json({ message: "Error updating student" });
  }
});

// Delete student by ID
router.delete("/students/:id", verifyAdmin, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: "Student not found" });

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting student" });
  }
});

// Delete coordinator by ID
router.delete("/coordinators/:id", verifyAdmin, async (req, res) => {
  try {
    const deleted = await Coordinator.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: "Coordinator not found" });

    res.json({ message: "Coordinator deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting coordinator" });
  }
}); 

//Edit coordinator by ID
router.put("/coordinators/:id", verifyAdmin, async (req, res) => {
  try {
    const { name, email, department } = req.body;   
    const updated = await Coordinator.findByIdAndUpdate(
      req.params.id,
      { name, email, department },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Coordinator not found" });    

    res.json({ message: "Coordinator updated successfully", coordinator: updated });
  } catch (err) {
    res.status(500).json({ message: "Error updating coordinator" });
  }
});

// // RESET PASSWORD (Admin Only)
// RESET PASSWORD (Admin Only)
router.post("/reset-password", verifyAdmin, async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Validate input
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and newPassword are required" });
    }

    // Check if coordinator exists
    const coordinator = await Coordinator.findOne({ email });
    if (!coordinator) {
      return res.status(404).json({ message: "Coordinator not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    coordinator.password = hashedPassword;
    await coordinator.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
});

module.exports = router;