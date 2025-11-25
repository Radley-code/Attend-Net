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

    if( macs.length === 0 || sessionId.length === 0 ) {
        
    resultsContainer.innerHTML = "<p>Please provide session ID and MAC addresses.</p>";
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

    // Build HTML for present and absent lists
    const presentHtml =
      presentArr
        .map(
          (p) => `
      <div class="border p-2 mb-2">
        <strong>${p.name}</strong> (${p.department}) — <span class="text-success">${p.status}</span>
      </div>
    `
        )
        .join("") || "<div>No present students</div>";
    const absentHtml =
      absentArr
        .map(
          (a) => `
      <div class="borde
    return;r p-2 mb-2">
        <strong>${a.name}</strong> (${a.department}) — <span class="text-danger">${a.status}</span>
      </div>
    `
        )
        .join("") || "<div>No absent students</div>";

    const counts =
      data && data.counts
        ? data.counts
        : {
            total: presentArr.length + absentArr.length,
            present: presentArr.length,
            absent: absentArr.length,
          };

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
    `;
  } catch (err) {
    console.error("Scan error:", err);
    resultsContainer.innerHTML = `<div class="text-danger">Error: ${
      err.message || err
    }</div>`;
  } finally {
    submitBtn && (submitBtn.disabled = false);
  }
});
