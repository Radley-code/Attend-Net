const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Coordinator = require("../models/coordinator");
const auth = require("../middleware/auth");

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const coordinator = await Coordinator.findOne({ email });
    if (!coordinator) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, coordinator.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: coordinator._id, role: coordinator.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1h" },
    );

    return res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});


// Get coordinator profile endpoint (must come BEFORE /:id route)
router.get("/me", auth, async (req, res) => {
  try {
    const coordinatorData = await Coordinator.findById(req.user.id).select(
      "name email",
    );
    if (!coordinatorData) {
      return res.status(404).json({ message: "Coordinator not found" });
    }
    return res.status(200).json(coordinatorData);
  } catch (err) {
    console.error("Get coordinator profile error:", err);
    return res
      .status(500)
      .json({ message: "Error fetching coordinator profile" });
  }
});

// Get coordinator by ID endpoint
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const coordinator = await Coordinator.findById(id).select("-password");

    if (!coordinator) {
      return res.status(404).json({ message: "Coordinator not found" });
    }

    return res.status(200).json(coordinator);
  } catch (err) {
    console.error("Get coordinator error:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching coordinator" });
  }
});

module.exports = router;
