const User = require("../models/user");

const registerStudent = async (req, res) => {
  try {
    console.log("registerStudent body:", req.body);
    const body = req.body || {};
    const { name, email, department, macAddress } = body;

    // Basic validation
    if (!name || !email || !department || !macAddress) {
      return res.status(400).json({
        message: "Missing required fields: name, email, department, macAddress",
      });
    }

    // Check if user with the same email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const newUser = new User({ name, email, department, macAddress });
    await newUser.save();
    return res
      .status(201)
      .json({ message: "Student registered successfully", user: newUser });
  } catch (error) {
    console.error(
      "Error registering student:",
      error && error.stack ? error.stack : error,
    );
    // If headers already sent, just exit
    if (res.headersSent) return;
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
};

const getAllDepartments = async (req, res) => {
  try {
    // Get all unique departments from registered students
    const departments = await User.distinct("department");

    if (!departments || departments.length === 0) {
      return res.status(200).json({ departments: [] });
    }

    return res.status(200).json({ departments: departments.sort() });
  } catch (error) {
    console.error("Error fetching departments:", error);
    if (res.headersSent) return;
    return res.status(500).json({ message: "Error fetching departments" });
  }
};

module.exports = {
  registerStudent,
  getAllDepartments,
};
