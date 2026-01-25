document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    document.getElementById("loginMessage").textContent =
      "Please provide email and password.";
    return;
  }

  document.getElementById("loginMessage").textContent = "";

  const res = await fetch("http://localhost:3000/api/coordinator/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (res.ok) {
    localStorage.setItem("token", data.token); // ✅ Persist login
    // Decode token to get coordinator ID
    const tokenParts = data.token.split(".");
    const decoded = JSON.parse(atob(tokenParts[1]));
    localStorage.setItem("coordinatorId", decoded.id);
    window.location.href = "coordinator_dashboard.html"; // redirect to dashboard
  } else {
    document.getElementById("loginMessage").textContent = data.message;
  }
});
