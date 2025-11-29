const API_URL = "http://localhost:3000/api/visitors";

// DOM elements
const filterDate = document.getElementById("filterDate");
const filterMonth = document.getElementById("filterMonth");
const applyFilter = document.getElementById("applyFilter");
const resetFilter = document.getElementById("resetFilter");
const reportTableBody = document.querySelector("#reportTable tbody");
const summarySection = document.getElementById("summarySection");
const totalVisitorsEl = document.getElementById("totalVisitors");
const totalVendorsEl = document.getElementById("totalVendors");
const totalPassesEl = document.getElementById("totalPasses");
const totalIssuesEl = document.getElementById("totalIssues");
const downloadCSV = document.getElementById("downloadCSV");
const printReport = document.getElementById("printReport");

// Mask Aadhaar
function formatAadhaar(aadhaar) {
  if (!aadhaar) return "-";
  const cleaned = aadhaar.replace(/\D/g, "");
  if (cleaned.length !== 12) return aadhaar;
  return `XXXX-XXXX-${cleaned.slice(-4)}`;
}

// Format date
function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// =========================
// Fetch and render report
// =========================
async function fetchReport(date = "", month = "") {
  try {
    const params = new URLSearchParams();
    if (date) params.append("date", date);
    if (month) params.append("month", month);

    const res = await fetch(`${API_URL}/filter?${params.toString()}`);
    const data = await res.json();

    reportTableBody.innerHTML = "";

    let visitorCount = 0,
        vendorCount = 0,
        issuesCount = 0;

    // Sort by last visit descending
    data.sort((a, b) => new Date(b.last_visit) - new Date(a.last_visit));

    data.forEach((item) => {
      const row = document.createElement("tr");

      const inTime = item.last_in_time || "-";
      const outTime = item.last_out_time || "-";

      if (outTime === "-") {
        row.style.backgroundColor = "#ffdada";
        row.title = "Exit not marked yet!";
        issuesCount++;
      }

      row.innerHTML = `
        <td>${formatAadhaar(item.aadhaar)}</td>
        <td>${item.gate_pass_no || "-"}</td>
        <td>${item.name}</td>
        <td>${item.address || "-"}</td>
        <td>${item.total_visits || 0}</td>
        <td>${item.visitor_type}</td>
        <td>${inTime}</td>
        <td>${outTime}</td>
        <td>${formatDate(item.last_visit)}</td>
        <td>${outTime === "-" ? "❗ Exit missing" : ""}</td>
      `;

      reportTableBody.appendChild(row);

      const type = (item.visitor_type || "").toLowerCase();
      if (type === "visitor") visitorCount++;
      else if (type === "vendor") vendorCount++;
    });

    totalVisitorsEl.textContent = visitorCount;
    totalVendorsEl.textContent = vendorCount;
    totalPassesEl.textContent = data.length;
    totalIssuesEl.textContent = issuesCount;

    summarySection.style.display = data.length ? "flex" : "none";

  } catch (err) {
    console.error("Error fetching report:", err);
    alert("Failed to fetch report. Check console.");
  }
}

// =========================
// Event Listeners
// =========================
applyFilter.addEventListener("click", () => {
  const date = filterDate.value;
  const month = filterMonth.value;
  if (!date && !month) return alert("Select date or month to filter");
  fetchReport(date, month);
});

resetFilter.addEventListener("click", () => {
  filterDate.value = "";
  filterMonth.value = "";
  fetchReport();
});

// CSV download
downloadCSV.addEventListener("click", () => {
  const rows = Array.from(reportTableBody.querySelectorAll("tr"));
  if (!rows.length) return alert("No data to download!");

  const headers = Array.from(
    document.querySelectorAll("#reportTable thead th")
  ).map((h) => `"${h.textContent}"`);

  const csvContent = [headers.join(",")];

  rows.forEach((row) => {
    const cols = Array.from(row.querySelectorAll("td")).map(td => `"${td.textContent}"`);
    csvContent.push(cols.join(","));
  });

  const blob = new Blob([csvContent.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daily_report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
});

// Print report
printReport.addEventListener("click", () => {
  const summaryClone = summarySection.cloneNode(true);
  summaryClone.querySelectorAll("button").forEach(btn => btn.remove());

  const tableClone = document.getElementById("reportTable").cloneNode(true);

  const printContainer = document.createElement("div");
  printContainer.style.padding = "20px";
  printContainer.appendChild(document.createElement("h2")).textContent = "Daily Gate Pass Report";
  printContainer.appendChild(summaryClone);
  printContainer.appendChild(tableClone);

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>Daily Gate Pass Report</title>
        <header>
          <h2> TATA BLUESCOPE STEEL</h2>
        </header>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          #summarySection { display: flex; gap: 20px; flex-wrap: wrap; font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>${printContainer.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
});

// =========================
// Initial fetch for today's data
// =========================
fetchReport(new Date().toISOString().slice(0, 10));
