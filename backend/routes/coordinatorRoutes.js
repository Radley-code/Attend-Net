const express = require("express");
const router = express.Router();
const Coordinator = require("../models/coordinator");
const verifyCoordinator = require("../middleware/auth");
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

module.exports = router;

// Additional coordinator routes can be added here

