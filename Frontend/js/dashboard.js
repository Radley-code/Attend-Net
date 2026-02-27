// Helper functions for localStorage tied to session
function getCoordinatorId() {
  return localStorage.getItem("coordinatorId") || "default";
}

function getCoordinatorName() {
  return localStorage.getItem("coordinatorName") || "Coordinator";
}

function getAttendanceKey(sessionId) {
  return `attendanceResults_${getCoordinatorId()}_${sessionId || "latest"}`;
}

function saveAttendanceResults(sessionId, results) {
  localStorage.setItem(getAttendanceKey(sessionId), JSON.stringify(results));
}

function loadAttendanceResults(sessionId) {
  const saved = localStorage.getItem(getAttendanceKey(sessionId));
  return saved ? JSON.parse(saved) : null;
}

function clearAttendanceResults(sessionId) {
  localStorage.removeItem(getAttendanceKey(sessionId));
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

  if (tabName === "sessions") {
    loadCoordinatorSessions();
  }
}

// Update Statistics
function updateReportStats(sessionId) {
  const saved = loadAttendanceResults(sessionId);

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
      department: student.department || "N/A",
      course: student.course || "N/A",
      // for now use course as session label so filters remain sensible
      session: student.course || "",
      status: "Present",
      timestamp: new Date(student.timestamp).toLocaleString(),
      scans:
        student.totalScans != null
          ? `${student.presentCount || 0}/${student.totalScans}`
          : "",
      rate:
        student.totalScans > 0
          ? ((student.presentCount / student.totalScans) * 100).toFixed(1) + "%"
          : "",
    });
  });

  absentArr.forEach((student) => {
    allRecords.push({
      name: student.name,
      department: student.department || "N/A",
      course: student.course || "N/A",
      session: student.course || "",
      status: "Absent",
      timestamp: new Date(student.timestamp).toLocaleString(),
      scans:
        student.totalScans != null
          ? `${student.presentCount || 0}/${student.totalScans}`
          : "",
      rate:
        student.totalScans > 0
          ? ((student.presentCount / student.totalScans) * 100).toFixed(1) + "%"
          : "",
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

  // Get unique sessions (use label for display)
  const sessionMap = {};
  allRecords.forEach((r) => {
    if (r.session && r.sessionLabel) {
      sessionMap[r.session] = r.sessionLabel;
    }
  });
  const sessionSelect = document.getElementById("filterSession");
  const currentSession = sessionSelect.value;

  sessionSelect.innerHTML = '<option value="">All Sessions</option>';
  Object.entries(sessionMap).forEach(([id, label]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    sessionSelect.appendChild(option);
  });
  sessionSelect.value = currentSession;
}

function renderTablePage() {
  const tbody = document.getElementById("attendanceTableBody");

  if (filteredRecords.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; color: #999">No attendance records found</td></tr>';
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
      <td>${record.department}</td>
      <td>${record.course}</td>
      <td>${record.scans || ""}</td>
      <td>${record.rate || ""}</td>
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

    // Session filter (compare id)
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

    const res = await fetch(`${BACKEND_CONFIG.URL}/api/coordinator/me`, {
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

// Fetch and load available departments
async function loadAvailableDepartments() {
  try {
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/users/departments`);
    const data = await res.json();

    if (!res.ok || !data.departments) {
      console.warn("No departments available from database");
      return;
    }

    const dropdownMenu = document.querySelector(".custom-dropdown-menu");

    // Map departments to department icons
    const departmentIcons = {
      "Computer Science": "fa-laptop-code",
      "Information Technology": "fa-server",
      Engineering: "fa-cog",
      Business: "fa-briefcase",
      Medicine: "fa-stethoscope",
      Arts: "fa-palette",
      Science: "fa-flask",
      Education: "fa-book",
      Law: "fa-gavel",
      Economics: "fa-chart-line",
      Psychology: "fa-brain",
      Medicine: "fa-dna",
      Agrobiotechnology: "fa-dna",
      Chemistry: "fa-flask-vial",
      Physics: "fa-atom",
      Mathematics: "fa-calculator",
      History: "fa-scroll",
      Literature: "fa-book-open",
      Philosophy: "fa-lightbulb",
      "Environmental Science": "fa-leaf",
      "Civil Engineering": "fa-building",
    };

    // Add department options
    data.departments.forEach((dept) => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.dataset.value = dept;

      const icon = departmentIcons[dept] || "fa-graduation-cap";
      item.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${dept}</span>
      `;

      item.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleDepartmentSelection(dept);
        updateDepartmentsField();
      });

      dropdownMenu.appendChild(item);
    });

    // Setup dropdown toggle
    const toggle = document.getElementById("departmentToggle");
    const menu = document.getElementById("departmentDropdown");
    const selectAllItem = document.querySelector(".dropdown-item.select-all");

    toggle.addEventListener("click", () => {
      const isOpen = menu.style.display !== "none";
      menu.style.display = isOpen ? "none" : "block";
      toggle.classList.toggle("active", !isOpen);
    });

    selectAllItem.addEventListener("click", (e) => {
      e.stopPropagation();
      const items = document.querySelectorAll(
        ".dropdown-item:not(.select-all)",
      );
      const allSelected = Array.from(items).every((item) =>
        item.classList.contains("selected"),
      );

      items.forEach((item) => {
        item.classList.toggle("selected", !allSelected);
      });

      updateDepartmentsField();
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".custom-dropdown-container")) {
        menu.style.display = "none";
        toggle.classList.remove("active");
      }
    });
  } catch (err) {
    console.error("Error loading departments:", err);
  }
}

function toggleDepartmentSelection(dept) {
  const item = document.querySelector(`.dropdown-item[data-value="${dept}"]`);
  if (item) {
    item.classList.toggle("selected");
  }
}

function updateDepartmentsField() {
  const selectedItems = document.querySelectorAll(
    ".dropdown-item.selected:not(.select-all)",
  );
  const selectedDepts = Array.from(selectedItems).map(
    (item) => item.dataset.value,
  );

  const selectedText = document.getElementById("selectedText");
  if (selectedDepts.length === 0) {
    selectedText.textContent = "Select departments...";
  } else if (selectedDepts.length === 1) {
    selectedText.textContent = selectedDepts[0];
  } else {
    selectedText.textContent = `${selectedDepts.length} departments selected`;
  }

  document.getElementById("departments").value = selectedDepts.join(",");
}

// Session Form Handler
document.getElementById("sessionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const course = document.getElementById("course").value.trim();
  const date = document.getElementById("date").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const departmentsField = document.getElementById("departments").value;
  // scan mode radio buttons
  const scanModeEl = document.querySelector('input[name="scanMode"]:checked');
  const scanMode = scanModeEl ? scanModeEl.value : "manual";

  // Validate all fields
  if (!course) {
    Swal.fire({
      icon: "warning",
      title: "Missing Course Name",
      text: "Please enter a course name",
      confirmButtonColor: "#1976d2",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });
    return;
  }

  if (!date) {
    Swal.fire({
      icon: "warning",
      title: "Missing Date",
      text: "Please select a date for the session",
      confirmButtonColor: "#1976d2",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });
    return;
  }

  if (!startTime) {
    Swal.fire({
      icon: "warning",
      title: "Missing Start Time",
      text: "Please select a start time",
      confirmButtonColor: "#1976d2",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });
    return;
  }

  if (!endTime) {
    Swal.fire({
      icon: "warning",
      title: "Missing End Time",
      text: "Please select an end time",
      confirmButtonColor: "#1976d2",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });
    return;
  }

  if (!departmentsField) {
    Swal.fire({
      icon: "warning",
      title: "Missing Selection",
      text: "Please select at least one department",
      confirmButtonColor: "#1976d2",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });
    return;
  }

  const departments = departmentsField.split(",").map((d) => d.trim());

  if (departments.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Missing Selection",
      text: "Please select at least one department",
      confirmButtonColor: "#1976d2",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Session Expired",
        text: "Please log in again to continue.",
        confirmButtonColor: "#1976d2",
        customClass: {
          container: "swal-container",
          popup: "swal-popup",
        },
      });
      return;
    }

    // Show loading state
    Swal.fire({
      title: "Creating Session",
      html: "Please wait while we create your session...",
      icon: "info",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: (modal) => {
        Swal.showLoading();
      },
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });

    // parse interval field (minutes)
    const intervalVal = parseInt(document.getElementById("interval").value, 10);
    const interval = isNaN(intervalVal) || intervalVal < 0 ? 0 : intervalVal;

    const res = await fetch(`${BACKEND_CONFIG.URL}/api/sessions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        course,
        date,
        startTime,
        endTime,
        departments,
        interval,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to create session");

    Swal.fire({
      icon: "success",
      title: "Session Created!",
      html: `<strong>${course}</strong> session has been created successfully.<br><small>Session ID: ${data.message}</small>`,
      confirmButtonColor: "#4caf50",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    }).then(() => {
      document.getElementById("sessionForm").reset();
      document.getElementById("selectedText").textContent =
        "Select departments...";
      // refresh list so the new session shows up immediately
      loadCoordinatorSessions();
    });
  } catch (err) {
    console.error("Session create error:", err);
    Swal.fire({
      icon: "error",
      title: "Creation Failed",
      text: err.message || "An error occurred while creating the session",
      confirmButtonColor: "#f44336",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });
  }
});

// replaced old scan form handler with new helper functions

// helper to send scan request (always network-based)
async function scanSession(sessionId) {
  const resultsContainer = document.getElementById("resultsContainer");
  try {
    // show interim message
    resultsContainer.innerHTML =
      '<div style="padding: 1rem; color: #0c5460; background: #d1ecf1; border-radius: 4px;">Scanning attendance...</div>';

    const token = localStorage.getItem("token");
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/attendance/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ sessionId }),
    });

    const data = await res.json();
    if (!res.ok)
      throw new Error((data && data.message) || "Attendance scan failed");

    const presentArr = Array.isArray(data.present) ? data.present : [];
    const absentArr = Array.isArray(data.absent) ? data.absent : [];
    const counts = data.counts || {
      total: presentArr.length + absentArr.length,
      present: presentArr.length,
      absent: absentArr.length,
    };

    saveAttendanceResults(sessionId, { presentArr, absentArr, counts });
    renderScanResults(presentArr, absentArr, counts);
    // update reports view if open
    updateReportStats(sessionId);
    return { presentArr, absentArr, counts };
  } catch (err) {
    console.error("Scan error:", err);
    resultsContainer.innerHTML = `<div style="padding: 1rem; color: #721c24; background: #f8d7da; border-radius: 4px;">Error: ${err.message || err}</div>`;
    throw err;
  }
}

function renderScanResults(presentArr, absentArr, counts) {
  const resultsContainer = document.getElementById("resultsContainer");

  const presentHtml =
    presentArr
      .map((p) => {
        const extra =
          p.totalScans != null
            ? ` <small>(${p.presentCount}/${p.totalScans} scans, ${
                p.totalScans > 0
                  ? ((p.presentCount / p.totalScans) * 100).toFixed(1) + "%"
                  : "0%"
              })</small>`
            : "";
        return `
    <div style="border: 1px solid #ddd; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${p.name}</strong> (${p.department}) — <span style="color: #28a745; font-weight: 600;">${p.status}</span>${extra}
    </div>
  `;
      })
      .join("") || '<div style="color: #999;">No present students</div>';

  const absentHtml =
    absentArr
      .map((a) => {
        const extra =
          a.totalScans != null
            ? ` <small>(${a.presentCount}/${a.totalScans} scans, ${
                a.totalScans > 0
                  ? ((a.presentCount / a.totalScans) * 100).toFixed(1) + "%"
                  : "0%"
              })</small>`
            : "";
        return `
    <div style="border: 1px solid #ddd; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${a.name}</strong> (${a.department}) — <span style="color: #dc3545; font-weight: 600;">${a.status}</span>${extra}
    </div>
  `;
      })
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

// load sessions owned by the logged in coordinator
async function loadCoordinatorSessions() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/sessions/mine`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch sessions");
    const data = await res.json();
    const sessions = data.sessions || [];
    renderSessionList(sessions);
  } catch (err) {
    console.error("Error loading sessions:", err);
    const container = document.getElementById("sessionListContainer");
    if (container)
      container.innerHTML = `<p style="color:#c00;">Could not load sessions.</p>`;
  }
}

// render sessions into upcoming / active / ended sections
function renderSessionList(sessions) {
  const upcomingDiv = document.getElementById("upcomingSessions");
  const activeDiv = document.getElementById("activeSessions");
  const endedDiv = document.getElementById("endedSessions");
  upcomingDiv.innerHTML = "";
  activeDiv.innerHTML = "";
  endedDiv.innerHTML = "";

  const now = new Date();
  sessions.forEach((s) => {
    const dateString = s.date.split("T")[0] || s.date;
    const start = new Date(`${dateString}T${s.startTime}`);
    const end = new Date(`${dateString}T${s.endTime}`);
    const status =
      s.status ||
      (now >= start && now <= end
        ? "active"
        : now < start
          ? "upcoming"
          : "ended");

    const card = document.createElement("div");
    card.className = "session-card";
    card.style =
      "border:1px solid #ccc; padding:0.75rem; margin-bottom:0.75rem; border-radius:4px; background:#fff;";
    card.innerHTML = `
      <div><strong>${s.course}</strong> (${dateString})</div>
      <div>Time: ${s.startTime} - ${s.endTime}</div>
      <div>Interval: ${s.interval || 0} min</div>
      <div>Departments: ${s.departments.join(", ")}</div>
      <div>Status: <span style="font-weight:600;">${status}</span></div>
    `;

    // add action button for manual scans when active
    const actions = document.createElement("div");
    actions.style = "margin-top:0.5rem;";
    if (status === "active") {
      const btn = document.createElement("button");
      btn.className = "btn-custom btn-primary-custom";
      btn.textContent = "Scan";
      btn.addEventListener("click", () => scanSession(s._id));
      actions.appendChild(btn);
    }
    card.appendChild(actions);

    if (status === "upcoming") {
      upcomingDiv.appendChild(card);
    } else if (status === "active") {
      activeDiv.appendChild(card);
    } else if (status === "ended") {
      endedDiv.appendChild(card);
    }
  });
}

// socket variable
let socket = null;

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  fetchCoordinatorData();
  loadCoordinatorInfo();
  updateReportStats();
  loadAvailableDepartments();
  initSocket();
});

function initSocket() {
  if (typeof io === "undefined") {
    console.warn("socket.io client not loaded");
    return;
  }
  socket = io(BACKEND_CONFIG.URL);
  socket.on("connect", () => {
    console.log("socket connected");
    socket.emit("join", { coordinatorId: getCoordinatorId() });
  });

  socket.on("sessionStarted", (session) => {
    console.log("sessionStarted event", session);
    loadCoordinatorSessions();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: `Session started: ${session.course}`,
      showConfirmButton: false,
      timer: 2000,
    });
  });

  socket.on("scanResult", (data) => {
    console.log("scanResult event", data);
    // persist results
    saveAttendanceResults(data.sessionId, {
      presentArr: data.present,
      absentArr: data.absent,
      counts: data.counts,
    });
    // update reports view if open
    updateReportStats(data.sessionId);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Scan done for ${data.course} at ${new Date(data.timestamp).toLocaleTimeString()}`,
      showConfirmButton: false,
      timer: 2000,
    });
  });
}
