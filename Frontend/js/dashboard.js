// Helper functions for localStorage
function getCoordinatorId() {
  return localStorage.getItem("coordinatorId") || "default";
}

function getAttendanceKey() {
  return `attendanceResults_${getCoordinatorId()}`;
}

function saveAttendanceResults(results) {
  localStorage.setItem(getAttendanceKey(), JSON.stringify(results));
}

function loadAttendanceResults() {
  const saved = localStorage.getItem(getAttendanceKey());
  return saved ? JSON.parse(saved) : null;
}

function clearAttendanceResults() {
  localStorage.removeItem(getAttendanceKey());
}

// Load and display saved results on page load
function displaySavedResults() {
  const saved = loadAttendanceResults();
  const resultsContainer = document.getElementById("resultsContainer");

  if (saved && saved.presentArr && saved.absentArr) {
    renderResults(saved.presentArr, saved.absentArr, saved.counts);
    console.log("Loaded attendance results from localStorage");
  }
}

// Render attendance results
function renderResults(presentArr, absentArr, counts) {
  const resultsContainer = document.getElementById("resultsContainer");

  const presentHtml =
    presentArr
      .map(
        (p) => `
    <div class="border p-2 mb-2">
      <strong>${p.name}</strong> (${p.department}) — <span class="text-success">${p.status}</span>
    </div>
  `,
      )
      .join("") || "<div>No present students</div>";

  const absentHtml =
    absentArr
      .map(
        (a) => `
    <div class="border p-2 mb-2">
      <strong>${a.name}</strong> (${a.department}) — <span class="text-danger">${a.status}</span>
    </div>
  `,
      )
      .join("") || "<div>No absent students</div>";

  resultsContainer.innerHTML = `
    <div class="mb-3"><strong>Total:</strong> ${counts.total} — <strong>Present:</strong> ${counts.present} — <strong>Absent:</strong> ${counts.absent}</div>
    <div class="row">
      <div class="col-md-6">
        <h5>Present</h5>
        ${presentHtml}
      </div>
      <div class="col-md-6">
        <h5>Absent</h5>
        ${absentHtml}
      </div>
    </div>
    <div class="mt-3">
      <button class="btn btn-secondary" onclick="clearAttendanceDisplay()">Clear Results</button>
    </div>
  `;
}

function clearAttendanceDisplay() {
  clearAttendanceResults();
  document.getElementById("resultsContainer").innerHTML = "";
}

document.getElementById("sessionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const course = document.getElementById("course").value;
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const departments = document.getElementById("departments").value.split(",");

  const res = await fetch("http://localhost:3000/api/sessions/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course, date, startTime, endTime, departments }),
  });

  try {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create session");
    alert(data.message);
    clearAttendanceDisplay();
  } catch (err) {
    console.error("Session create error:", err);
    alert("Error creating session: " + (err.message || err));
  }
});

document.getElementById("scanForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sessionId = document.getElementById("sessionId").value;
  const macs = document.getElementById("macs").value
    ? document.getElementById("macs").value.split(",")
    : [];
  const resultsContainer = document.getElementById("resultsContainer");
  const submitBtn = document.querySelector('#scanForm button[type="submit"]');

  if (macs.length === 0 || sessionId.length === 0) {
    resultsContainer.innerHTML =
      "<p>Please provide session ID and MAC addresses.</p>";
    return;
  }

  try {
    submitBtn && (submitBtn.disabled = true);
    resultsContainer.innerHTML = "<p>Scanning attendance...</p>";

    const res = await fetch("http://localhost:3000/api/attendance/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, connectedMacs: macs }),
    });

    const data = await res.json();
    console.log("scan response raw:", data, "status:", res.status);
    if (!res.ok)
      throw new Error((data && data.message) || "Attendance scan failed");

    // Ensure arrays
    const presentArr = Array.isArray(data && data.present) ? data.present : [];
    const absentArr = Array.isArray(data && data.absent) ? data.absent : [];

    const counts =
      data && data.counts
        ? data.counts
        : {
            total: presentArr.length + absentArr.length,
            present: presentArr.length,
            absent: absentArr.length,
          };

    // Save to localStorage
    saveAttendanceResults({ presentArr, absentArr, counts });

    // Render results
    renderResults(presentArr, absentArr, counts);
  } catch (err) {
    console.error("Scan error:", err);
    resultsContainer.innerHTML = `<div class="text-danger">Error: ${
      err.message || err
    }</div>`;
  } finally {
    submitBtn && (submitBtn.disabled = false);
  }
});

// Load saved results when page loads
window.addEventListener("DOMContentLoaded", displaySavedResults);
