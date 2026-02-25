// Device Alert Modal
const deviceAlertOverlay = document.getElementById("deviceAlertOverlay");
const deviceAlertDismiss = document.getElementById("deviceAlertDismiss");
const deviceAlertClose = document.getElementById("deviceAlertClose");
const deviceAlertRetrigger = document.getElementById("deviceAlertRetrigger");

// Function to show device alert
function showDeviceAlert() {
  deviceAlertOverlay.classList.remove("hidden");
  deviceAlertOverlay.classList.add("show");
}

// Show device alert on every page load
window.addEventListener("load", () => {
  // Small delay for smoother appearance after page load
  setTimeout(() => {
    showDeviceAlert();
  }, 300);
});

// Dismiss device alert (dismiss button)
deviceAlertDismiss.addEventListener("click", () => {
  deviceAlertOverlay.classList.remove("show");
  deviceAlertOverlay.classList.add("hidden");
});

// Close device alert (X button)
if (deviceAlertClose) {
  deviceAlertClose.addEventListener("click", () => {
    deviceAlertOverlay.classList.remove("show");
    deviceAlertOverlay.classList.add("hidden");
  });
}

// Re-trigger device alert (info icon in header)
if (deviceAlertRetrigger) {
  deviceAlertRetrigger.addEventListener("click", (e) => {
    e.preventDefault();
    showDeviceAlert();
  });
}

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

// Make MAC input readonly to prevent manual edits (security)
if (macAddressInput) macAddressInput.readOnly = true;

// Detect MAC Address
detectMacBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  detectMacBtn.disabled = true;
  detectMacBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Detecting...';

  try {
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/users/detect-mac`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (res.ok && data.success) {
      macAddressInput.value = data.macAddress.toUpperCase();
      showMessage(`✓ MAC address detected: ${data.macAddress}`, "success");
    } else {
      showMessage(
        `Unable to auto-detect MAC address.\n\n` +
          `📱 Find your MAC address:\n` +
          `Windows: Settings > Network > WiFi > Advanced > Physical Address\n` +
          `Or run in Command Prompt: ipconfig /all\n\n` +
          `Enter it manually in the field above.`,
        "error",
      );
    }
  } catch (err) {
    showMessage(
      `Connection error while detecting MAC.\n\n` +
        `Please find your MAC address manually:\n` +
        `Windows: open Command Prompt and run: ipconfig /all\n` +
        `Look for "Physical Address" field.`,
      "error",
    );
    console.error("MAC detection error:", err);
  } finally {
    detectMacBtn.disabled = false;
    detectMacBtn.innerHTML = '<i class="fas fa-bolt"></i>';
  }
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
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/users/register`, {
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
        (err.message || "Please check your connection and try again.") +
        ` (Trying to reach: ${BACKEND_CONFIG.URL})`,
      "error",
    );
    console.error("Registration error:", err);
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

// MAC formatting disabled — field is readonly to avoid manual spoofing

// Email validation on blur
document.getElementById("email").addEventListener("blur", (e) => {
  const email = e.target.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email && !emailRegex.test(email)) {
    showMessage("Please enter a valid email address.", "error");
  }
});
