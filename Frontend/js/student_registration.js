// Theme Toggle
const studentThemeToggle = document.getElementById("studentThemeToggle");

// Load saved theme preference
const savedStudentTheme = localStorage.getItem("theme") || "light";
if (savedStudentTheme === "dark") {
  document.body.classList.add("dark-theme");
  studentThemeToggle.classList.add("active");
}

studentThemeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  studentThemeToggle.classList.toggle("active");

  const theme = document.body.classList.contains("dark-theme")
    ? "dark"
    : "light";
  localStorage.setItem("theme", theme);
});

// Registration Form
const registrationForm = document.getElementById("registrationForm");
const registrationMessage = document.getElementById("registrationMessage");
const registerBtn = document.getElementById("registerBtn");
const macAddressInput = document.getElementById("macAddress");
const detectMacBtn = document.getElementById("detectMacBtn");

// Detect MAC Address
detectMacBtn.addEventListener("click", (e) => {
  e.preventDefault();
  detectMacBtn.disabled = true;
  detectMacBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  // Simulate MAC detection (in a real app, this would use a native library)
  // For now, we'll generate a demo MAC or let user enter it manually
  setTimeout(() => {
    // Generate a demo MAC address pattern
    const demoMac = "AA:BB:CC:DD:EE:FF";
    macAddressInput.placeholder =
      "Auto-detect not available on this browser. Enter manually.";
    showMessage(
      "Note: MAC address auto-detection requires native application.",
      "info",
    );

    detectMacBtn.disabled = false;
    detectMacBtn.innerHTML = '<i class="fas fa-bolt"></i>';
  }, 500);
});

// Form Submission
registrationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  registrationMessage.textContent = "";
  registrationMessage.className = "registration-message";

  // Validate MAC address format
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  const macAddress = document
    .getElementById("macAddress")
    .value.trim()
    .toUpperCase();

  if (!macRegex.test(macAddress)) {
    showMessage("Invalid MAC address format. Use AA:BB:CC:DD:EE:FF", "error");
    return;
  }

  // Prepare payload
  const payload = {
    name: document.getElementById("fullName").value.trim(),
    email: document.getElementById("email").value.trim(),
    department: document.getElementById("department").value.trim(),
    macAddress: macAddress,
  };

  // Validate all fields
  if (
    !payload.name ||
    !payload.email ||
    !payload.department ||
    !payload.macAddress
  ) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  // Disable button and show loading state
  registerBtn.disabled = true;
  registerBtn.innerHTML =
    '<span style="display: inline-block; margin-right: 0.5rem;"><i class="fas fa-spinner fa-spin"></i></span>Registering...';

  try {
    const res = await fetch("http://localhost:3000/api/users/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      showMessage(
        `✓ Registration successful! Welcome, ${payload.name}!`,
        "success",
      );

      // Store registration info
      localStorage.setItem("studentName", payload.name);
      localStorage.setItem("studentEmail", payload.email);
      localStorage.setItem("studentDepartment", payload.department);
      localStorage.setItem("studentMac", payload.macAddress);

      // Reset form
      registrationForm.reset();

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = "studentpage.html"; // will change to dashboard if I get to that point
      }, 2000);
    } else {
      showMessage(
        data.message || "Registration failed. Please try again.",
        "error",
      );
    }
  } catch (err) {
    showMessage(
      "Network error: " +
        (err.message || "Please check your connection and try again."),
      "error",
    );
  } finally {
    registerBtn.disabled = false;
    registerBtn.innerHTML =
      '<i class="fas fa-check-circle"></i> Register Device';
  }
});

// Helper function to show messages
function showMessage(message, type) {
  registrationMessage.textContent = message;
  registrationMessage.className = `registration-message show ${type}`;

  // Auto-hide error/info messages after 5 seconds (but not success)
  if (type !== "success") {
    setTimeout(() => {
      registrationMessage.classList.remove("show");
    }, 5000);
  }
}

// MAC Address input formatter (auto-format with colons)
macAddressInput.addEventListener("input", (e) => {
  let value = e.target.value.toUpperCase().replace(/[^0-9A-F]/g, "");

  // Format as AA:BB:CC:DD:EE:FF
  let formatted = "";
  for (let i = 0; i < value.length; i++) {
    if (i > 0 && i % 2 === 0) {
      formatted += ":";
    }
    formatted += value[i];
  }

  // Limit to MAC address length
  if (formatted.length > 17) {
    formatted = formatted.substring(0, 17);
  }

  e.target.value = formatted;
});

// Email validation on blur
document.getElementById("email").addEventListener("blur", (e) => {
  const email = e.target.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email && !emailRegex.test(email)) {
    showMessage("Please enter a valid email address.", "error");
  }
});
