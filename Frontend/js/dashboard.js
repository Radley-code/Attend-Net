// Helper functions for localStorage
function getCoordinatorId() {
  return localStorage.getItem("coordinatorId") || "default";
}

function getCoordinatorName() {
  return localStorage.getItem("coordinatorName") || "Coordinator";
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

// Theme Toggle
const themeToggle = document.getElementById("themeToggle");

// Load saved theme preference
const savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") {
  document.body.classList.add("dark-theme");
  themeToggle.classList.add("active");
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  themeToggle.classList.toggle("active");

  const theme = document.body.classList.contains("dark-theme")
    ? "dark"
    : "light";
  localStorage.setItem("theme", theme);
});

// Mobile Menu Toggle
const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");
const navTabs = document.getElementById("navbarTabs");
const profileMenuBtn = document.getElementById("profileMenuBtn");
const profileDropdown = document.getElementById("profileDropdown");

hamburgerBtn.addEventListener("click", () => {
  hamburgerBtn.classList.toggle("active");
  mobileMenuOverlay.classList.toggle("active");
  navTabs.classList.toggle("active");
});

// Close mobile menu when clicking overlay
mobileMenuOverlay.addEventListener("click", () => {
  hamburgerBtn.classList.remove("active");
  mobileMenuOverlay.classList.remove("active");
  navTabs.classList.remove("active");
});

// Profile dropdown menu
profileMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle("active");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".navbar-right")) {
    profileDropdown.classList.remove("active");
  }
});

// Tab Navigation
const navLinks = document.querySelectorAll(".nav-link");
const tabContents = document.querySelectorAll(".tab-content");

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const tabName = link.getAttribute("data-tab");
    switchTab(tabName);

    // Close mobile menu after tab selection
    if (window.innerWidth <= 768) {
      hamburgerBtn.classList.remove("active");
      mobileMenuOverlay.classList.remove("active");
      navTabs.classList.remove("active");
    }
  });
});

function switchTab(tabName) {
  // Hide all tabs
  tabContents.forEach((tab) => tab.classList.remove("active"));

  // Remove active class from all links
  navLinks.forEach((link) => link.classList.remove("active"));

  // Show selected tab
  document.getElementById(tabName).classList.add("active");

  // Add active class to clicked link
  document.querySelectorAll(`[data-tab="${tabName}"]`).forEach((link) => {
    link.classList.add("active");
  });

  if (tabName === "reports") {
    updateReportStats();
  }
}

// Update Statistics
function updateReportStats() {
  const saved = loadAttendanceResults();

  if (saved && saved.presentArr && saved.absentArr) {
    const presentCount = saved.presentArr.length;
    const absentCount = saved.absentArr.length;
    const totalCount = presentCount + absentCount;
    const rate =
      totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

    document.getElementById("totalStudents").textContent = totalCount;
    document.getElementById("totalPresent").textContent = presentCount;
    document.getElementById("totalAbsent").textContent = absentCount;
    document.getElementById("attendanceRate").textContent = rate + "%";

    // Populate table
    populateAttendanceTable(saved.presentArr, saved.absentArr);
  } else {
    document.getElementById("totalStudents").textContent = "0";
    document.getElementById("totalPresent").textContent = "0";
    document.getElementById("totalAbsent").textContent = "0";
    document.getElementById("attendanceRate").textContent = "0%";
    document.getElementById("attendanceTableBody").innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: #999">No attendance records found</td></tr>';
  }
}

// Populate Attendance Table
let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const recordsPerPage = 10;

function populateAttendanceTable(presentArr, absentArr) {
  allRecords = [];

  presentArr.forEach((student) => {
    allRecords.push({
      name: student.name,
      id: student.id || "N/A",
      course: student.course || "N/A",
      session: student.session || "N/A",
      status: "Present",
      timestamp: new Date().toLocaleString(),
    });
  });

  absentArr.forEach((student) => {
    allRecords.push({
      name: student.name,
      id: student.id || "N/A",
      course: student.course || "N/A",
      session: student.session || "N/A",
      status: "Absent",
      timestamp: new Date().toLocaleString(),
    });
  });

  // Populate filter dropdowns
  populateFilterDropdowns();

  // Initialize filtered records with all records
  filteredRecords = [...allRecords];

  currentPage = 1;
  renderTablePage();
}

// Populate Filter Dropdowns
function populateFilterDropdowns() {
  // Get unique courses
  const courses = [
    ...new Set(allRecords.map((r) => r.course).filter((c) => c !== "N/A")),
  ];
  const courseSelect = document.getElementById("filterCourse");
  const currentCourse = courseSelect.value;

  courseSelect.innerHTML = '<option value="">All Courses</option>';
  courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course;
    option.textContent = course;
    courseSelect.appendChild(option);
  });
  courseSelect.value = currentCourse;

  // Get unique sessions
  const sessions = [
    ...new Set(allRecords.map((r) => r.session).filter((s) => s !== "N/A")),
  ];
  const sessionSelect = document.getElementById("filterSession");
  const currentSession = sessionSelect.value;

  sessionSelect.innerHTML = '<option value="">All Sessions</option>';
  sessions.forEach((session) => {
    const option = document.createElement("option");
    option.value = session;
    option.textContent = session;
    sessionSelect.appendChild(option);
  });
  sessionSelect.value = currentSession;
}

function renderTablePage() {
  const tbody = document.getElementById("attendanceTableBody");

  if (filteredRecords.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: #999">No attendance records found</td></tr>';
    document.getElementById("pageInfo").textContent = "Page 1";
    document.getElementById("prevBtn").disabled = true;
    document.getElementById("nextBtn").disabled = true;
    return;
  }

  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const pageRecords = filteredRecords.slice(startIndex, endIndex);

  tbody.innerHTML = pageRecords
    .map(
      (record) => `
    <tr>
      <td>${record.name}</td>
      <td>${record.id}</td>
      <td>${record.course}</td>
      <td>${record.session}</td>
      <td><span class="status-${record.status.toLowerCase()}">${record.status}</span></td>
      <td>${record.timestamp}</td>
    </tr>
  `,
    )
    .join("");

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  document.getElementById("pageInfo").textContent =
    `Page ${currentPage} of ${totalPages}`;
  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled = currentPage === totalPages;
}

// Pagination
document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTablePage();
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTablePage();
  }
});

// Filter Functionality
function applyFilters() {
  const filterDate = document.getElementById("filterDate").value;
  const filterCourse = document.getElementById("filterCourse").value;
  const filterSession = document.getElementById("filterSession").value;

  filteredRecords = allRecords.filter((record) => {
    let match = true;

    // Date filter
    if (filterDate) {
      const recordDate = new Date(record.timestamp).toISOString().split("T")[0];
      match = match && recordDate === filterDate;
    }

    // Course filter
    if (filterCourse) {
      match = match && record.course === filterCourse;
    }

    // Session filter
    if (filterSession) {
      match = match && record.session === filterSession;
    }

    return match;
  });

  // Reset to first page and update display
  currentPage = 1;
  renderTablePage();
  updateFilteredStats();
}

function updateFilteredStats() {
  if (filteredRecords.length === 0) {
    document.getElementById("totalStudents").textContent = "0";
    document.getElementById("totalPresent").textContent = "0";
    document.getElementById("totalAbsent").textContent = "0";
    document.getElementById("attendanceRate").textContent = "0%";
    return;
  }

  const presentCount = filteredRecords.filter(
    (r) => r.status === "Present",
  ).length;
  const absentCount = filteredRecords.filter(
    (r) => r.status === "Absent",
  ).length;
  const totalCount = presentCount + absentCount;
  const rate =
    totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

  document.getElementById("totalStudents").textContent = totalCount;
  document.getElementById("totalPresent").textContent = presentCount;
  document.getElementById("totalAbsent").textContent = absentCount;
  document.getElementById("attendanceRate").textContent = rate + "%";
}

// Add event listeners to filter inputs
document.getElementById("filterDate").addEventListener("change", applyFilters);
document
  .getElementById("filterCourse")
  .addEventListener("change", applyFilters);
document
  .getElementById("filterSession")
  .addEventListener("change", applyFilters);

// Action Buttons
document.getElementById("previewEmailBtn").addEventListener("click", () => {
  if (filteredRecords.length === 0) {
    alert("No records to preview");
    return;
  }
  alert("Email preview feature coming soon!");
});

document.getElementById("exportPdfBtn").addEventListener("click", () => {
  if (filteredRecords.length === 0) {
    alert("No attendance records to export");
    return;
  }
  alert("PDF export feature coming soon!");
});

document.getElementById("sendEmailBtn").addEventListener("click", () => {
  if (filteredRecords.length === 0) {
    alert("No attendance records to send");
    return;
  }
  alert("Email sending feature coming soon!");
});

// Settings Tab & Logout
document.getElementById("settingsLink").addEventListener("click", (e) => {
  e.preventDefault();
  switchTab("settings");
  profileDropdown.classList.remove("active");
});

document.getElementById("logoutLink").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("coordinatorId");
  localStorage.removeItem("coordinatorName");
  localStorage.removeItem("coordinatorEmail");
  window.location.href = "login.html";
});

// Fetch coordinator data from API
async function fetchCoordinatorData() {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://localhost:3000/api/coordinator/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      // Store in localStorage for persistence
      localStorage.setItem("coordinatorName", data.name || data.email);
      localStorage.setItem("coordinatorEmail", data.email);

      // Update UI
      displayCoordinatorProfile(data);
      updateSettingsDisplay(data);
    }
  } catch (err) {
    console.error("Error fetching coordinator data:", err);
  }
}

// Display coordinator profile
function displayCoordinatorProfile(coordinator) {
  const coordName = coordinator.name || coordinator.email.split("@")[0];
  const coordEmail = coordinator.email;

  document.getElementById("coordNameDisplay").textContent = coordName;
  document.getElementById("coordEmailDisplay").textContent = coordEmail;
  document.getElementById("welcomeName").textContent = coordName.split(" ")[0]; // First name only for welcome

  // Generate initials for avatar
  const initials = coordName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const avatarEl = document.getElementById("profileAvatar");
  avatarEl.innerHTML = `<span>${initials}</span>`;
  avatarEl.title = coordName;

  // Update settings tab
  document.getElementById("coordId").textContent = getCoordinatorId();
  document.getElementById("coordEmail").textContent = coordEmail;
}

function updateSettingsDisplay(coordinator) {
  // Update settings tab with coordinator info
  document.getElementById("coordId").textContent =
    coordinator._id || getCoordinatorId();
  document.getElementById("coordEmail").textContent = coordinator.email;
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("coordinatorId");
  window.location.href = "login.html";
});

// Load coordinator info in settings
function loadCoordinatorInfo() {
  const coordId = getCoordinatorId();
  const coordName = getCoordinatorName();
  document.getElementById("coordId").textContent = coordId;
  document.getElementById("coordEmail").textContent =
    localStorage.getItem("coordinatorEmail") || "Not available";
  document.getElementById("coordNameDisplay").textContent = coordName;
}

// Session Form Handler
document.getElementById("sessionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const course = document.getElementById("course").value;
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const departments = document
    .getElementById("departments")
    .value.split(",")
    .map((d) => d.trim());

  try {
    const res = await fetch("http://localhost:3000/api/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course, date, startTime, endTime, departments }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create session");

    alert("Session created successfully: " + data.message);
    document.getElementById("sessionForm").reset();
  } catch (err) {
    console.error("Session create error:", err);
    alert("Error creating session: " + (err.message || err));
  }
});

// Scan Form Handler
document.getElementById("scanForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sessionId = document.getElementById("sessionId").value;
  const macs = document.getElementById("macs").value
    ? document
        .getElementById("macs")
        .value.split(",")
        .map((m) => m.trim())
    : [];
  const resultsContainer = document.getElementById("resultsContainer");
  const submitBtn = document.querySelector('#scanForm button[type="submit"]');

  if (macs.length === 0 || sessionId.length === 0) {
    resultsContainer.innerHTML =
      '<div style="padding: 1rem; color: #dc3545; background: #f8d7da; border-radius: 4px;">Please provide session ID and MAC addresses.</div>';
    return;
  }

  try {
    submitBtn && (submitBtn.disabled = true);
    resultsContainer.innerHTML =
      '<div style="padding: 1rem; color: #0c5460; background: #d1ecf1; border-radius: 4px;">Scanning attendance...</div>';

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
    renderScanResults(presentArr, absentArr, counts);
  } catch (err) {
    console.error("Scan error:", err);
    resultsContainer.innerHTML = `<div style="padding: 1rem; color: #721c24; background: #f8d7da; border-radius: 4px;">Error: ${err.message || err}</div>`;
  } finally {
    submitBtn && (submitBtn.disabled = false);
  }
});

function renderScanResults(presentArr, absentArr, counts) {
  const resultsContainer = document.getElementById("resultsContainer");

  const presentHtml =
    presentArr
      .map(
        (p) => `
    <div style="border: 1px solid #ddd; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${p.name}</strong> (${p.department}) — <span style="color: #28a745; font-weight: 600;">${p.status}</span>
    </div>
  `,
      )
      .join("") || '<div style="color: #999;">No present students</div>';

  const absentHtml =
    absentArr
      .map(
        (a) => `
    <div style="border: 1px solid #ddd; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${a.name}</strong> (${a.department}) — <span style="color: #dc3545; font-weight: 600;">${a.status}</span>
    </div>
  `,
      )
      .join("") || '<div style="color: #999;">No absent students</div>';

  resultsContainer.innerHTML = `
    <div style="margin-top: 1.5rem; background: white; padding: 1.5rem; border-radius: 8px;">
      <div style="margin-bottom: 1rem; padding: 1rem; background: #f0f0f0; border-radius: 4px;">
        <strong>Total:</strong> ${counts.total} — <strong>Present:</strong> ${counts.present} — <strong>Absent:</strong> ${counts.absent}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div>
          <h5 style="color: #28a745; margin-bottom: 1rem;">Present</h5>
          ${presentHtml}
        </div>
        <div>
          <h5 style="color: #dc3545; margin-bottom: 1rem;">Absent</h5>
          ${absentHtml}
        </div>
      </div>
      <div style="margin-top: 1.5rem;">
        <button class="btn-custom btn-secondary-custom" onclick="clearScanDisplay()">Clear Results</button>
      </div>
    </div>
  `;
}

function clearScanDisplay() {
  document.getElementById("resultsContainer").innerHTML = "";
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  fetchCoordinatorData();
  loadCoordinatorInfo();
  updateReportStats();
});
