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

// Countdown timer variables
let countdownInterval = null;
let currentScanSessionId = null;
let currentScanInterval = 0;
let remainingSeconds = 0;

// Countdown timer functions
function startCountdown(sessionId, intervalMinutes) {
  // Clear any existing countdown
  stopCountdown();

  currentScanSessionId = sessionId;
  currentScanInterval = intervalMinutes;
  remainingSeconds = intervalMinutes * 60;

  // Show countdown container
  const countdownContainer = document.getElementById("countdownContainer");
  if (countdownContainer) {
    countdownContainer.style.display = "block";
  }

  // Update display immediately
  updateCountdownDisplay();

  // Start the interval
  countdownInterval = setInterval(() => {
    remainingSeconds--;
    updateCountdownDisplay();

    if (remainingSeconds <= 0) {
      // Time's up - perform automatic scan
      performAutoScan();
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // Hide countdown container
  const countdownContainer = document.getElementById("countdownContainer");
  if (countdownContainer) {
    countdownContainer.style.display = "none";
  }

  // Reset variables
  currentScanSessionId = null;
  currentScanInterval = 0;
  remainingSeconds = 0;
}

function updateCountdownDisplay() {
  const timerElement = document.getElementById("countdownTimer");
  if (timerElement && remainingSeconds >= 0) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
}

async function performAutoScan() {
  if (!currentScanSessionId) return;

  try {
    await scanSession(currentScanSessionId);

    // Restart countdown for next scan
    if (currentScanInterval > 0) {
      startCountdown(currentScanSessionId, currentScanInterval);
    }
  } catch (error) {
    console.error("Auto scan failed:", error);
    // Show error notification
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "error",
      title: "Auto scan failed",
      text: error.message || "Unknown error occurred",
      showConfirmButton: false,
      timer: 3000,
    });

    // Stop countdown on error
    stopCountdown();
  }
}

// Theme Toggle
const themeToggle = document.getElementById("themeToggle");

// Load saved theme preference
const savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") {
  document.body.classList.add("dark-theme");
  themeToggle.classList.add("active");
}

// Cancel auto-scan button event listener
document.addEventListener("DOMContentLoaded", () => {
  const cancelScanBtn = document.getElementById("cancelScanBtn");
  if (cancelScanBtn) {
    cancelScanBtn.addEventListener("click", () => {
      stopCountdown();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Auto-scan cancelled",
        showConfirmButton: false,
        timer: 2000,
      });
    });
  }
});

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

// Update Statistics - loads from all active sessions unless specific sessionId passed
function updateReportStats(sessionId) {
  allRecords = [];
  let totalPresent = 0;
  let totalAbsent = 0;

  if (sessionId) {
    // Load single session
    const saved = loadAttendanceResults(sessionId);
    if (saved && saved.presentArr && saved.absentArr) {
      totalPresent = saved.presentArr.length;
      totalAbsent = saved.absentArr.length;
      populateAttendanceTable(saved.presentArr, saved.absentArr);
      return;
    }
  } else {
    // Load from ALL active sessions in localStorage
    if (
      typeof currentSessions !== "undefined" &&
      Array.isArray(currentSessions)
    ) {
      const now = new Date();
      currentSessions.forEach((sess) => {
        const dateString = (sess.date || "").split("T")[0];
        const start = new Date(`${dateString}T${sess.startTime}`);
        const end = new Date(`${dateString}T${sess.endTime}`);
        const isActive = now >= start && now <= end;

        if (isActive) {
          const saved = loadAttendanceResults(sess._id);
          if (saved && saved.presentArr && saved.absentArr) {
            totalPresent += saved.presentArr.length;
            totalAbsent += saved.absentArr.length;
            populateAttendanceTable(saved.presentArr, saved.absentArr, true); // append mode
          }
        }
      });
    }
  }

  // Update summary stats
  const totalCount = totalPresent + totalAbsent;
  const rate =
    totalCount > 0 ? ((totalPresent / totalCount) * 100).toFixed(1) : 0;

  document.getElementById("totalStudents").textContent = totalCount;
  document.getElementById("totalPresent").textContent = totalPresent;
  document.getElementById("totalAbsent").textContent = totalAbsent;
  document.getElementById("attendanceRate").textContent = rate + "%";

  if (totalCount === 0) {
    document.getElementById("attendanceTableBody").innerHTML =
      '<tr><td colspan="7" style="text-align: center; color: #999">No attendance records found</td></tr>';
    return;
  }

  populateFilterDropdowns();
  filteredRecords = [...allRecords];
  currentPage = 1;
  renderTablePage();
}

// Populate Attendance Table
let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const recordsPerPage = 10;

function populateAttendanceTable(presentArr, absentArr, appendMode = false) {
  if (!appendMode) {
    allRecords = [];
  }

  presentArr.forEach((student) => {
    allRecords.push({
      name: student.name,
      department: student.department || "N/A",
      course: student.course || "N/A",
      sessionId: student.session || "",
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
      sessionId: student.session || "",
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

  if (!appendMode) {
    populateFilterDropdowns();
    filteredRecords = [...allRecords];
    currentPage = 1;
    renderTablePage();
  }
}

// Populate Filter Dropdowns
function populateFilterDropdowns() {
  // Get unique active courses from records
  const activeCourses = [
    ...new Set(
      allRecords.map((r) => r.course).filter((c) => c !== "N/A" && c !== ""),
    ),
  ];
  const courseSelect = document.getElementById("filterCourse");
  const currentCourse = courseSelect.value;

  courseSelect.innerHTML = '<option value="">All Courses</option>';
  activeCourses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course;
    option.textContent = course;
    courseSelect.appendChild(option);
  });
  courseSelect.value = currentCourse;
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
      Finance: "fa-chart-line",
      Marketing: "fa-chart-line",
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

  if (new Date(`${date}T${startTime}`) >= new Date(`${date}T${endTime}`)) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Time Range",
      text: "Start time must be before end time",
      confirmButtonColor: "#1976d2",
      customClass: {
        container: "swal-container",
        popup: "swal-popup",
      },
    });
    return;
  }

  if (new Date(`${date}T${startTime}`) <= new Date()) {
    Swal.fire({
      icon: "warning",
      title: "Invalid Time Range",
      text: "Start time must be in the future",
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
    
    // Handle cooldown error
    if (res.status === 429) {
      resultsContainer.innerHTML = `<div style="padding: 1rem; color: #856404; background: #fff3cd; border-radius: 4px;">
        <i class="fas fa-clock"></i> ${data.message}
      </div>`;
      
      // Show countdown if cooldown time provided
      if (data.cooldown) {
        let remainingTime = data.cooldown;
        const countdownInterval = setInterval(() => {
          remainingTime--;
          if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            resultsContainer.innerHTML = '';
            return;
          }
          resultsContainer.innerHTML = `<div style="padding: 1rem; color: #856404; background: #fff3cd; border-radius: 4px;">
            <i class="fas fa-clock"></i> Please wait ${remainingTime} seconds before scanning again
          </div>`;
        }, 1000);
      }
      throw new Error(data.message);
    }
    
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
    if (!err.message.includes('Please wait')) {
      resultsContainer.innerHTML = `<div style="padding: 1rem; color: #721c24; background: #f8d7da; border-radius: 4px;">Error: ${err.message || err}</div>`;
    }
    throw err;
  }
}

function renderScanResults(presentArr, absentArr, counts) {
  const resultsContainer = document.getElementById("resultsContainer");
  const attendanceRate =
    counts.total > 0 ? ((counts.present / counts.total) * 100).toFixed(1) : 0;

  const presentHtml =
    presentArr
      .map((p) => {
        const extra =
          p.totalScans != null
            ? ` <small class="text-muted">(${p.presentCount}/${p.totalScans} scans, ${
                p.totalScans > 0
                  ? ((p.presentCount / p.totalScans) * 100).toFixed(1) + "%"
                  : "0%"
              })</small>`
            : "";
        return `
    <div class="student-record present-record">
      <div class="student-info">
        <i class="fas fa-user-circle student-avatar"></i>
        <div class="student-details">
          <div class="student-name">${p.name}</div>
          <div class="student-meta">${p.department} ${extra}</div>
        </div>
      </div>
      <div class="attendance-badge present-badge">
        <i class="fas fa-check-circle"></i> Present
      </div>
    </div>
  `;
      })
      .join("") || '<div class="no-records">No present students</div>';

  const absentHtml =
    absentArr
      .map((a) => {
        const extra =
          a.totalScans != null
            ? ` <small class="text-muted">(${a.presentCount}/${a.totalScans} scans, ${
                a.totalScans > 0
                  ? ((a.presentCount / a.totalScans) * 100).toFixed(1) + "%"
                  : "0%"
              })</small>`
            : "";
        return `
    <div class="student-record absent-record">
      <div class="student-info">
        <i class="fas fa-user-circle student-avatar"></i>
        <div class="student-details">
          <div class="student-name">${a.name}</div>
          <div class="student-meta">${a.department} ${extra}</div>
        </div>
      </div>
      <div class="attendance-badge absent-badge">
        <i class="fas fa-times-circle"></i> Absent
      </div>
    </div>
  `;
      })
      .join("") || '<div class="no-records">No absent students</div>';

  resultsContainer.innerHTML = `
    <div class="scan-results-container">
      <div class="scan-summary">
        <div class="summary-card">
          <div class="summary-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="summary-content">
            <div class="summary-number">${counts.total}</div>
            <div class="summary-label">Total Students</div>
          </div>
        </div>
        <div class="summary-card present">
          <div class="summary-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="summary-content">
            <div class="summary-number">${counts.present}</div>
            <div class="summary-label">Present</div>
          </div>
        </div>
        <div class="summary-card absent">
          <div class="summary-icon">
            <i class="fas fa-times-circle"></i>
          </div>
          <div class="summary-content">
            <div class="summary-number">${counts.absent}</div>
            <div class="summary-label">Absent</div>
          </div>
        </div>
        <div class="summary-card rate">
          <div class="summary-icon">
            <i class="fas fa-percentage"></i>
          </div>
          <div class="summary-content">
            <div class="summary-number">${attendanceRate}%</div>
            <div class="summary-label">Attendance Rate</div>
          </div>
        </div>
      </div>
      
      <div class="students-grid">
        <div class="students-section">
          <div class="section-header">
            <h5><i class="fas fa-check-circle text-success"></i> Present Students</h5>
            <span class="count-badge present-count">${counts.present}</span>
          </div>
          <div class="students-list">
            ${presentHtml}
          </div>
        </div>
        
        <div class="students-section">
          <div class="section-header">
            <h5><i class="fas fa-times-circle text-danger"></i> Absent Students</h5>
            <span class="count-badge absent-count">${counts.absent}</span>
          </div>
          <div class="students-list">
            ${absentHtml}
          </div>
        </div>
      </div>
      
      <div class="scan-actions">
        <button class="btn-custom btn-secondary-custom" onclick="clearScanDisplay()">
          <i class="fas fa-eraser"></i> Clear Results
        </button>
        <button class="btn-custom btn-primary-custom" onclick="switchTab('reports')">
          <i class="fas fa-chart-bar"></i> View Full Report
        </button>
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
    currentSessions = sessions; // Store globally for report aggregation
    renderSessionList(sessions);
  } catch (err) {
    console.error("Error loading sessions:", err);
    const container = document.getElementById("sessionListContainer");
    if (container)
      container.innerHTML = `<p style="color:#c00;">Could not load sessions.</p>`;
  }
}

// render sessions into upcoming / active / ended sections with "see more" for non-active
function renderSessionList(sessions) {
  const upcomingDiv = document.getElementById("upcomingSessions");
  const activeDiv = document.getElementById("activeSessions");
  const endedDiv = document.getElementById("endedSessions");
  upcomingDiv.innerHTML = "";
  activeDiv.innerHTML = "";
  endedDiv.innerHTML = "";

  const now = new Date();
  const upcoming = [];
  const active = [];
  const ended = [];

  sessions.forEach((s) => {
    const dateString = (s.date || "").split("T")[0];
    const start = new Date(`${dateString}T${s.startTime}`);
    const end = new Date(`${dateString}T${s.endTime}`);
    const status =
      s.status ||
      (now >= start && now <= end
        ? "active"
        : now < start
          ? "upcoming"
          : "ended");

    if (status === "upcoming") {
      upcoming.push({ session: s, status });
    } else if (status === "active") {
      active.push({ session: s, status });
    } else {
      ended.push({ session: s, status });
    }
  });

  // Render active sessions (always full display)
  active.forEach((item) => {
    activeDiv.appendChild(createSessionCard(item.session, item.status));
  });

  // Render upcoming sessions with "see more" if needed
  const upcomingLimit = 2;
  renderSectionWithSeeMore(
    upcomingDiv,
    upcoming,
    "upcomingSessions",
    upcomingLimit,
  );

  // Render ended sessions with "see more" if needed
  const endedLimit = 2;
  renderSectionWithSeeMore(endedDiv, ended, "endedSessions", endedLimit);
}

function createSessionCard(s, status) {
  const dateString = (s.date || "").split("T")[0];
  const card = document.createElement("div");
  card.className = "session-card";
  card.style =
    "border:1px solid #ccc; padding:0.75rem; margin-bottom:0.75rem; border-radius:4px; background:#fff; position: relative;";
  card.innerHTML = `
    <div><strong>${s.course}</strong> (${dateString})</div>
    <div>Time: ${s.startTime} - ${s.endTime}</div>
    <div>Interval: ${s.interval || 0} min</div>
    <div class="departments-list">
      <strong>Departments:</strong>
      <div class="departments-tags">${s.departments.map((dept) => `<span class="dept-tag">${dept}</span>`).join("")}</div>
    </div>
    <div>Status: <span style="font-weight:600;">${status}</span></div>
  `;

  // add action button for manual scans when active
  const actions = document.createElement("div");
  actions.style =
    "margin-top:0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;";

  if (status === "active") {
    // Add scan button
    const scanBtn = document.createElement("button");
    scanBtn.className = "btn-custom btn-primary-custom";
    scanBtn.textContent = "Scan Now";
    scanBtn.addEventListener("click", () => scanSession(s._id));
    actions.appendChild(scanBtn);

    // Add auto-scan button if interval > 0
    if (s.interval && s.interval > 0) {
      const autoScanBtn = document.createElement("button");
      autoScanBtn.className = "btn-custom btn-secondary-custom";
      autoScanBtn.textContent = "Start Auto-Scan";
      autoScanBtn.addEventListener("click", () => {
        startCountdown(s._id, s.interval);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `Auto-scan started for ${s.course}`,
          text: `Scanning every ${s.interval} minutes`,
          showConfirmButton: false,
          timer: 3000,
        });
      });
      actions.appendChild(autoScanBtn);
    }
  } else if (status === "upcoming") {
    // Department management buttons for upcoming sessions
    const editDeptsBtn = document.createElement("button");
    editDeptsBtn.className = "btn-custom btn-secondary-custom";
    editDeptsBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Depts';
    editDeptsBtn.addEventListener("click", () => openDepartmentModal(s));
    actions.appendChild(editDeptsBtn);

    const editSessionBtn = document.createElement("button");
    editSessionBtn.className = "btn-custom btn-info-custom";
    editSessionBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit';
    editSessionBtn.addEventListener("click", () => openEditSessionModal(s));
    actions.appendChild(editSessionBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-custom btn-danger-custom";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.addEventListener("click", () => deleteSession(s._id));
    actions.appendChild(deleteBtn);
  } else if (status === "ended") {
    // View results for ended sessions
    const viewResultsBtn = document.createElement("button");
    viewResultsBtn.className = "btn-custom btn-primary-custom";
    viewResultsBtn.innerHTML = '<i class="fas fa-chart-bar"></i> View Results';
    viewResultsBtn.addEventListener("click", () => {
      loadSessionResults(s._id);
      switchTab("reports");
    });
    actions.appendChild(viewResultsBtn);
  }

  card.appendChild(actions);
  return card;
}

function renderSectionWithSeeMore(container, items, sectionId, limit) {
  if (items.length === 0) return;

  const shown = items.slice(0, limit);
  const hidden = items.slice(limit);

  shown.forEach((item) => {
    container.appendChild(createSessionCard(item.session, item.status));
  });

  if (hidden.length > 0) {
    const seeMoreDiv = document.createElement("div");
    seeMoreDiv.style = "text-align:center; margin-top:0.5rem;";
    const toggle = document.createElement("button");
    toggle.className = "btn-custom btn-secondary-custom";
    toggle.textContent = `See More (${hidden.length} more)`;
    toggle.style = "font-size:0.9rem; padding:0.4rem 0.8rem;";

    const hiddenContainer = document.createElement("div");
    hiddenContainer.id = `${sectionId}_hidden`;
    hiddenContainer.style = "display:none;";

    hidden.forEach((item) => {
      hiddenContainer.appendChild(createSessionCard(item.session, item.status));
    });

    toggle.addEventListener("click", () => {
      const isVisible = hiddenContainer.style.display !== "none";
      hiddenContainer.style.display = isVisible ? "none" : "block";
      toggle.textContent = isVisible
        ? `See More (${hidden.length} more)`
        : "See Less";
    });

    seeMoreDiv.appendChild(toggle);
    container.appendChild(hiddenContainer);
    container.appendChild(seeMoreDiv);
  }
}

// socket variable
let socket = null;
let currentSessions = []; // Track all sessions for report aggregation

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
    const coordinatorId = getCoordinatorId();
    socket.emit("joinCoordinatorRoom", coordinatorId);
  });

  socket.on("sessionStarted", (session) => {
    console.log("sessionStarted event", session);
    loadCoordinatorSessions();
    // Auto-switch to sessions tab when session starts
    switchTab("sessions");
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: `Session started: ${session.course}`,
      text: "Session is now active and ready for scanning",
      showConfirmButton: false,
      timer: 3000,
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
    // show scan results in current view
    renderScanResults(data.present, data.absent, data.counts);

    // Show notification with better formatting
    const totalStudents = data.counts.total;
    const presentCount = data.counts.present;
    const attendanceRate =
      totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Scan Complete: ${data.course}`,
      html: `
        <div style="text-align: left;">
          <div><strong>Total:</strong> ${totalStudents}</div>
          <div><strong>Present:</strong> ${presentCount}</div>
          <div><strong>Absent:</strong> ${data.counts.absent}</div>
          <div><strong>Rate:</strong> ${attendanceRate}%</div>
        </div>
      `,
      showConfirmButton: false,
      timer: 4000,
    });
  });
}

// Department Management Functions
let currentEditingSession = null;
let allAvailableDepartments = [];

function openDepartmentModal(session) {
  currentEditingSession = session;
  document.getElementById("sessionCourseDisplay").value =
    `${session.course} (${session.date.split("T")[0]})`;

  // Load available departments
  loadAvailableDepartmentsForModal();

  // Show current departments
  renderCurrentDepartments(session.departments || []);

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById("departmentModal"));
  modal.show();
}

async function loadAvailableDepartmentsForModal() {
  try {
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/users/departments`);
    const data = await res.json();
    allAvailableDepartments = data.departments || [];
    renderAvailableDepartments();
  } catch (err) {
    console.error("Error loading departments:", err);
    allAvailableDepartments = [];
  }
}

function renderCurrentDepartments(currentDepts) {
  const container = document.getElementById("currentDepartments");
  container.innerHTML = currentDepts
    .map(
      (dept) => `
    <span class="department-tag current">
      ${dept}
      <button type="button" class="btn-remove" onclick="removeDepartment('${dept}')">
        <i class="fas fa-times"></i>
      </button>
    </span>
  `,
    )
    .join("");
}

function renderAvailableDepartments() {
  const container = document.getElementById("availableDepartments");
  const currentDepts = currentEditingSession?.departments || [];
  const availableDepts = allAvailableDepartments.filter(
    (dept) => !currentDepts.includes(dept),
  );

  container.innerHTML = availableDepts
    .map(
      (dept) => `
    <span class="department-tag available" onclick="addDepartment('${dept}')">
      <i class="fas fa-plus"></i> ${dept}
    </span>
  `,
    )
    .join("");
}

function addDepartment(dept) {
  if (!currentEditingSession) return;

  if (!currentEditingSession.departments) {
    currentEditingSession.departments = [];
  }

  if (!currentEditingSession.departments.includes(dept)) {
    currentEditingSession.departments.push(dept);
    renderCurrentDepartments(currentEditingSession.departments);
    renderAvailableDepartments();
  }
}

function removeDepartment(dept) {
  if (!currentEditingSession) return;

  const index = currentEditingSession.departments.indexOf(dept);
  if (index > -1) {
    currentEditingSession.departments.splice(index, 1);
    renderCurrentDepartments(currentEditingSession.departments);
    renderAvailableDepartments();
  }
}

function addNewDepartment() {
  const input = document.getElementById("newDepartment");
  const deptName = input.value.trim();

  if (!deptName) {
    Swal.fire("Warning", "Please enter a department name", "warning");
    return;
  }

  if (!currentEditingSession.departments) {
    currentEditingSession.departments = [];
  }

  if (currentEditingSession.departments.includes(deptName)) {
    Swal.fire("Warning", "Department already exists", "warning");
    return;
  }

  currentEditingSession.departments.push(deptName);
  renderCurrentDepartments(currentEditingSession.departments);
  renderAvailableDepartments();
  input.value = "";

  // Add to available departments list
  if (!allAvailableDepartments.includes(deptName)) {
    allAvailableDepartments.push(deptName);
  }
}

async function saveDepartmentChanges() {
  if (!currentEditingSession) return;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${BACKEND_CONFIG.URL}/api/sessions/${currentEditingSession._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          departments: currentEditingSession.departments,
        }),
      },
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to update departments");
    }

    Swal.fire("Success", "Departments updated successfully", "success");
    bootstrap.Modal.getInstance(
      document.getElementById("departmentModal"),
    ).hide();
    loadCoordinatorSessions();
  } catch (err) {
    console.error("Error updating departments:", err);
    Swal.fire("Error", err.message, "error");
  }
}

// Session Edit Functions
function openEditSessionModal(session) {
  document.getElementById("editSessionId").value = session._id;
  document.getElementById("editCourse").value = session.course;
  document.getElementById("editDate").value = session.date.split("T")[0];
  document.getElementById("editStartTime").value = session.startTime;
  document.getElementById("editEndTime").value = session.endTime;
  document.getElementById("editInterval").value = session.interval || 5;

  const modalElement = document.getElementById("editSessionModal");
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

async function updateSession() {
  const sessionId = document.getElementById("editSessionId").value;
  const course = document.getElementById("editCourse").value.trim();
  const date = document.getElementById("editDate").value;
  const startTime = document.getElementById("editStartTime").value;
  const endTime = document.getElementById("editEndTime").value;
  const interval = parseInt(document.getElementById("editInterval").value) || 0;

  if (!course || !date || !startTime || !endTime) {
    Swal.fire("Warning", "Please fill in all required fields", "warning");
    return;
  }

  if (new Date(`${date}T${startTime}`) >= new Date(`${date}T${endTime}`)) {
    Swal.fire("Warning", "Start time must be before end time", "warning");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        course,
        date,
        startTime,
        endTime,
        interval,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to update session");
    }

    Swal.fire("Success", "Session updated successfully", "success");
    bootstrap.Modal.getInstance(
      document.getElementById("editSessionModal"),
    ).hide();
    loadCoordinatorSessions();
  } catch (err) {
    console.error("Error updating session:", err);
    Swal.fire("Error", err.message, "error");
  }
}

async function deleteSession(sessionId) {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to recover this session!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!",
  });

  if (!result.isConfirmed) return;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BACKEND_CONFIG.URL}/api/sessions/${sessionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to delete session");
    }

    Swal.fire("Success", "Session deleted successfully", "success");
    loadCoordinatorSessions();
  } catch (err) {
    console.error("Error deleting session:", err);
    Swal.fire("Error", err.message, "error");
  }
}

async function loadSessionResults(sessionId) {
  try {
    const saved = loadAttendanceResults(sessionId);
    if (saved && saved.presentArr && saved.absentArr) {
      populateAttendanceTable(saved.presentArr, saved.absentArr);
      updateReportStats(sessionId);
    } else {
      // Try to fetch from server if not in localStorage
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BACKEND_CONFIG.URL}/api/attendance/debug/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const docs = data.docs || [];

        const presentArr = [];
        const absentArr = [];

        docs.forEach((doc) => {
          const student = {
            name: doc.studentId.name,
            department: doc.studentId.department,
            course: doc.sessionId.course,
            status: doc.status === "present" ? "Present" : "Absent",
            timestamp: doc.timestamp,
            presentCount: doc.presentCount || 0,
            totalScans: doc.totalScans || 0,
          };

          if (doc.status === "present") {
            presentArr.push(student);
          } else {
            absentArr.push(student);
          }
        });

        saveAttendanceResults(sessionId, {
          presentArr,
          absentArr,
          counts: {
            total: presentArr.length + absentArr.length,
            present: presentArr.length,
            absent: absentArr.length,
          },
        });
        populateAttendanceTable(presentArr, absentArr);
        updateReportStats(sessionId);
      }
    }
  } catch (err) {
    console.error("Error loading session results:", err);
    Swal.fire("Error", "Failed to load session results", "error");
  }
}
