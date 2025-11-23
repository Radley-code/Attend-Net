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
    body: JSON.stringify({ course, date, startTime, endTime, departments })
  });

  const data = await res.json();
  alert(data.message);
});

document.getElementById("scanForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sessionId = document.getElementById("sessionId").value;
  const macs = document.getElementById("macs").value.split(",");

  const res = await fetch("http://localhost:3000/api/attendance/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, connectedMacs: macs })
  });

  const data = await res.json();
  document.getElementById("resultsContainer").innerHTML = data.results.map(r => `
    <div class="border p-2 mb-2">
      <strong>${r.studentId.name}</strong> (${r.studentId.department}) — <span class="${r.status === 'Present' ? 'text-success' : 'text-danger'}">${r.status}</span>
    </div>
  `).join("");
});