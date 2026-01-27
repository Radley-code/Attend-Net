const express = require("express");
const router = express.Router();
const Coordinator = require("../models/coordinator");
const verifyCoordinator = require("../middleware/auth");
const bcrypt = require("bcryptjs");
//route to fetch coordinator info to display in the dashboard 
router.get("/me", verifyCoordinator, async (req, res) => {
  try {
    const coordinatorData = await Coordinator.findById(req.user.id).select(
      "name email",
    );
    res.json(coordinatorData);
  } catch (err) {
    res.status(500).json({ message: "Error fetching coordinator profile" });
  }
});

// RESET PASSWORD (Admin Only)
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

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

// Additional coordinator routes can be added here

