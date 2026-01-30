const express = require("express");
const router = express.Router();
const Admin = require("../models/admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Coordinator = require("../models/coordinatorModel");
const verifyAdmin = require("../middleware/verifyAdmin");

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
router.post("/create-coordinator", verifyAdmin, async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const coordinator = new Coordinator({
      name,
      email,
      password: hashed,
      department
    });

    await coordinator.save();

    res.json({ message: "Coordinator created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error creating coordinator" });
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


module.exports = router;