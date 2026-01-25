// Theme Toggle for Login Page
const loginThemeToggle = document.getElementById("loginThemeToggle");

// Load saved theme preference
const savedLoginTheme = localStorage.getItem("theme") || "light";
if (savedLoginTheme === "dark") {
  document.body.classList.add("dark-theme");
  loginThemeToggle.classList.add("active");
}

loginThemeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  loginThemeToggle.classList.toggle("active");

  const theme = document.body.classList.contains("dark-theme")
    ? "dark"
    : "light";
  localStorage.setItem("theme", theme);
});

// Password Toggle
const passwordToggle = document.getElementById("passwordToggle");
const passwordInput = document.getElementById("password");

passwordToggle.addEventListener("click", (e) => {
  e.preventDefault();
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  // Toggle eye icon
  const icon = passwordToggle.querySelector("i");
  icon.classList.toggle("fa-eye");
  icon.classList.toggle("fa-eye-slash");
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginBtn = document.getElementById("loginBtn");
  const loginMessage = document.getElementById("loginMessage");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    loginMessage.textContent = "Please enter a valid email address.";
    loginMessage.className = "error";
    return;
  }

  if (password.length < 6) {
    loginMessage.textContent = "Password must be at least 6 characters long.";
    loginMessage.className = "error";
    return;
  }

  if (!email || !password) {
    loginMessage.textContent = "Please provide email and password.";
    loginMessage.className = "error";
    return;
  }

  loginMessage.textContent = "";
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="loading-spinner"></span>Logging in...';

  try {
    const res = await fetch("http://localhost:3000/api/coordinator/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      // Decode token to get coordinator ID
      const tokenParts = data.token.split(".");
      const decoded = JSON.parse(atob(tokenParts[1]));
      localStorage.setItem("coordinatorId", decoded.id);
      localStorage.setItem("coordinatorEmail", email);
      // Extract name from email (before @) or use a default
      const coordName =
        email.split("@")[0].charAt(0).toUpperCase() +
        email.split("@")[0].slice(1);
      localStorage.setItem("coordinatorName", coordName);

      loginMessage.textContent = "Login successful! Redirecting...";
      loginMessage.className = "success";

      setTimeout(() => {
        window.location.href = "coordinator_dashboard.html";
      }, 800);
    } else {
      loginMessage.textContent =
        data.message || "Login failed. Please try again.";
      loginMessage.className = "error";
      loginBtn.disabled = false;
      loginBtn.innerHTML = "Login";
    }
  } catch (err) {
    loginMessage.textContent = "Error: " + (err.message || "Connection failed");
    loginMessage.className = "error";
    loginBtn.disabled = false;
    loginBtn.innerHTML = "Login";
  }
});
