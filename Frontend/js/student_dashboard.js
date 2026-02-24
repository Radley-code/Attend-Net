const macaddress = require("macaddress");
const User = require("../models/user");

exports.registerUser = async (req, res) => {
  try {
    const { name, email, department } = req.body;

    // Scrape MAC address from device
    const mac = await macaddress.one();

    const user = new User({
      name,
      email,
      department,
      macaddress: mac,
    });

    await user.save();
    res.json({ message: "User registered successfully", mac });
  } catch (err) {
    res.status(500).json({ message: "Error registering user" });
  }
};

const form = document.getElementById("studentForm");
const messageEl = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  messageEl.textContent = "";
  messageEl.className = "";

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    department: document.getElementById("department").value.trim(),
    macaddress: document.getElementById("macaddress").value.trim(),
  };

  try {
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      messageEl.textContent = data.message || "Registered successfully.";
      messageEl.className = "success";
      form.reset();
    } else {
      messageEl.textContent = data.message || "Registration failed.";
      messageEl.className = "error";
    }
  } catch (err) {
    messageEl.textContent = "Network error. Please try again.";
    messageEl.className = "error";
  }
});
