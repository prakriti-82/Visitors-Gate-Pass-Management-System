const API_URL = "http://localhost:3000/api/visitors";
const visitorTableBody = document.querySelector("#visitorTable tbody");
const visitorDetailsCard = document.getElementById("visitorDetails");
const detailsContent = document.getElementById("detailsContent");
const filterDate = document.getElementById("filterDate");
const filterMonth = document.getElementById("filterMonth");
const applyFilterBtn = document.getElementById("applyFilter");
const resetFilterBtn = document.getElementById("resetFilter");
const todayLabel = document.getElementById("todayLabel");
let emailInProgress = false;

// ============================
// Helper: format Aadhaar
// ============================
function formatAadhaar(aadhaar) {
  if (!aadhaar) return "-";
  const cleaned = aadhaar.replace(/\D/g, "");
  if (cleaned.length !== 12) return aadhaar;
  return `XXXX-XXXX-${cleaned.slice(-4)}`;
}

// ============================
// Helper: format date
// ============================
function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================
// Helper: prepare gate pass payload (needed for email)
// ============================
function prepareGatePassEmailPayload(gatePassData, photoEl = null) {
  const maskedAadhaar =
    gatePassData.aadhaar?.length === 12
      ? "XXXXXXXX" + gatePassData.aadhaar.slice(-4)
      : gatePassData.aadhaar || "-";

  let photoData = null;
  if (photoEl && photoEl.src) photoData = photoEl.src;
  else if (gatePassData.photo) photoData = gatePassData.photo;

  return {
    name: gatePassData.name,
    email: gatePassData.email || "",
    address: gatePassData.address || "-",  // ✅ ADD THIS LINE
    image: photoData,
    summary: `${gatePassData.name} - Gate Pass ${gatePassData.gate_pass_no || "-"}`,
    gate_pass_no: gatePassData.gate_pass_no || "-",
    aadhaar: maskedAadhaar,
    type: gatePassData.type || "Visitor",
    generated_by: gatePassData.generated_by || "-",
    meet_to: gatePassData.meet_to || "-",
    building: gatePassData.building || "-",
    equipment: gatePassData.equipment || "-",
    persons: gatePassData.persons || 1,
    accompanying_names: gatePassData.accompanying_names || "-",
    date: gatePassData.date || gatePassData.visit_date || "-",
    time_in: gatePassData.inTime || gatePassData.time_in || "-",
    time_out: gatePassData.outTime || gatePassData.time_out || "-",
    note: gatePassData.building === "Plant" ? " Note: ⚠️ Please Visit HSE for Safety instructions" : "",
  };
}

// ============================
// Load visitors/vendors
// ============================
async function loadVisitors(date = null, month = null) {
  visitorTableBody.innerHTML = "";
  let url = `${API_URL}/filter`;
  let labelText = "";

  if (date) {
    url += `?date=${date}`;
    labelText = `Showing records for ${date}`;
  } else if (month) {
    url += `?month=${month}`;
    labelText = `Showing records for ${month}`;
  } else {
    const today = new Date().toISOString().split("T")[0];
    url += `?date=${today}`;
    labelText = `Showing today's records (${today})`;
  }

  try {
    const res = await fetch(url);
    const records = await res.json();

    if (!records || records.length === 0) {
      todayLabel.textContent = "No records found.";
      return;
    }
    todayLabel.textContent = labelText;

    records.forEach((record) => addVisitorRow(record));
  } catch (err) {
    console.error(err);
    alert("Failed to load records.");
  }
}

// ============================
// Add a table row
// ============================
function addVisitorRow(record) {
  const tr = document.createElement("tr");
  const type = record.visitor_type || "Visitor";

  tr.innerHTML = `
    <td>${formatAadhaar(record.aadhaar)}</td>
    <td>${record.name || "-"}</td>
    <td>${record.address || "-"}</td>
    <td>${record.total_visits || 0}</td>
    <td>${type}</td>
    <td>
      <div class="dropdown">
        <button class="btn-action view">Actions &#9662;</button>
        <div class="dropdown-content">
          <a href="#" class="reopen">Reopen Gate Pass</a>
          <a href="#" class="history">View History</a>
        </div>
      </div>
    </td>
  `;

  tr.dataset.gatepass = record.gate_pass_no;

  // History click
  if (type.toLowerCase() === "vendor") {
    tr.querySelector(".history").addEventListener("click", () =>
      showVendorHistory(record.aadhaar, record.name)
    );
  } else {
    tr.querySelector(".history").addEventListener("click", () =>
      showVisitorHistory(record.aadhaar, record.name)
    );
  }

  // Reopen gate pass
  tr.querySelector(".reopen").addEventListener("click", () =>
    reopenGatePass(record.aadhaar, type, tr.dataset.gatepass)
  );

  visitorTableBody.appendChild(tr);
}

// ============================
// Visitor history
// ============================
async function showVisitorHistory(aadhar, name) {
  try {
    const res = await fetch(`${API_URL}/history/${aadhar}`);
    const visits = await res.json();

    if (!visits.length) {
      detailsContent.innerHTML = `<p>No visit history for ${name} (Visitor).</p>`;
    } else {
      let html = `<h4>Visit History for ${name} (Visitor)</h4><ul>`;
      visits.forEach((v) => {
        html += `<li>
          Date: ${formatDate(v.visit_date)}, In: ${v.time_in || "-"}, Out: ${v.time_out || "-"}, Generated By: ${v.generated_by || "-"},
          Meeting: ${v.meet_to || "-"}, Building: ${v.building || "-"},
          Equipment: ${v.equipment || "-"}, Persons: ${v.persons || 1},
          Accompanying: ${v.accompanying_names || "-"}, Gate Pass: ${v.gate_pass_no || "-"}
        </li>`;
      });
      html += "</ul>";
      detailsContent.innerHTML = html;
    }
    visitorDetailsCard.style.display = "block";
  } catch (err) {
    console.error(err);
    alert("Failed to load visitor history.");
  }
}

// ============================
// Vendor history
// ============================
async function showVendorHistory(aadhar, name) {
  try {
    const res = await fetch(`${API_URL}/vendor-history/${aadhar}`);
    const visits = await res.json();

    if (!visits.length) {
      detailsContent.innerHTML = `<p>No visit history for ${name} (Vendor).</p>`;
    } else {
      let html = `<h4>Visit History for ${name} (Vendor)</h4><ul>`;
      visits.forEach((v) => {
        html += `<li>
          Date: ${formatDate(v.visit_date)}, In: ${v.time_in || "-"}, Out: ${v.time_out || "-"},
          Meeting: ${v.meet_to || "-"}, Building: ${v.building || "-"},
          Equipment: ${v.equipment || "-"}, Generated By: ${v.generated_by || "-"}, Persons: ${v.persons || 1},
          Accompanying: ${v.accompanying_names || "-"}, Gate Pass: ${v.gate_pass_no || "-"}
        </li>`;
      });
      html += "</ul>";
      detailsContent.innerHTML = html;
    }
    visitorDetailsCard.style.display = "block";
  } catch (err) {
    console.error(err);
    alert("Failed to load vendor history.");
  }
}

// ============================
// Filters
// ============================
applyFilterBtn.addEventListener("click", () =>
  loadVisitors(filterDate.value, filterMonth.value)
);
resetFilterBtn.addEventListener("click", () => {
  filterDate.value = "";
  filterMonth.value = "";
  loadVisitors();
});

// ============================
// Close details card
// ============================
document.getElementById("closeDetails").addEventListener("click", () => {
  detailsContent.innerHTML = "";
  visitorDetailsCard.style.display = "none";
});

// Reopen gate pass
async function reopenGatePass(aadhar, type, gatePassNo) {
  try {
    const res = await fetch(`${API_URL}/reopen/${type}/${aadhar}/${gatePassNo}`);
    if (!res.ok) throw new Error("Gate pass not found");
    const data = await res.json();

    const note = data.building === "Plant" ? "⚠️ Visit HSE for Safety instructions." : "";

    const html = `
      <div class="gate-pass-card">
        <h2>Gate Pass</h2>
        <h2>TATA BLUESCOPE STEEL</h2>
        <div class="photo-section">
          ${data.photo ? `<img src="${data.photo}" alt="Visitor Photo">` : '<p>No photo available</p>'}
        </div>
        <div class="gate-pass-info">
          <div><strong>Gate Pass No:</strong> ${data.gate_pass_no}</div>
          <div><strong>Name:</strong> ${data.name}</div>
          <div><strong>Aadhaar:</strong> ${formatAadhaar(data.aadhaar)}</div>
        </div>
        <p><strong>Address:</strong> ${data.address}</p>
        <p><strong>Generated By:</strong> ${data.generated_by || "-"}</p>
        <p><strong>Meeting With:</strong> ${data.meet_to || "-"}</p>
        <p><strong>Building:</strong> ${data.building}</p>
        <p><strong>Equipment:</strong> ${data.equipment}</p>
        <p><strong>Persons:</strong> ${data.persons}</p>
        <p><strong>Accompanying:</strong> ${data.accompanying_names || "-"}</p>
        <p><strong>Date:</strong> ${formatDate(data.visit_date)}</p>
        <p><strong>In Time:</strong> ${data.time_in || "-"}</p>
        <p><strong>Out Time:</strong> ${data.time_out || "-"}</p>
        ${note ? `<p><strong>${note}</strong></p>` : ""}
        <div class="btn-group">
          <button id="printPassBtn">🖨 Print Gate Pass</button>
          <button id="emailPassBtn">✉️ Send via Email</button>
          <button id="sendSecurityBtn">📧 Send to Security</button>
          <button id="backBtn">🔙 Back</button>
        </div>
        <p id="emailStatus" style="display:none;margin-top:10px;"></p>
      </div>
    `;

    detailsContent.innerHTML = html;
    visitorDetailsCard.style.display = "block";

    // Print
   document.getElementById("printPassBtn").onclick = () => {
  const gatePassDiv = detailsContent.querySelector(".gate-pass-card");
  const clone = gatePassDiv.cloneNode(true);

  // Remove buttons before printing
  const btnGroup = clone.querySelector(".btn-group");
  if (btnGroup) btnGroup.remove();

  const emailStatus = clone.querySelector("#emailStatus");
  if (emailStatus) emailStatus.remove();

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`<html><head><title>Gate Pass - ${data.name}</title></head><body>${clone.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.print();
};


    // Optional email (anyone)
    document.getElementById("emailPassBtn").onclick = async () => {
      const email = prompt("Enter email to send this Gate Pass:");
      if (!email) return;
      await sendGatePassEmail(data, email);
    };

    // Hardcoded security email
    document.getElementById("sendSecurityBtn").onclick = async () => {
      const securityEmail = "sidhikumari562@gmail.com";
      await sendGatePassEmail(data, securityEmail);
    };

    // Back
    document.getElementById("backBtn").onclick = () => {
      detailsContent.innerHTML = "";
      visitorDetailsCard.style.display = "none";
    };

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// ============================
// Send gate pass email
// ============================
async function sendGatePassEmail(data, email) {
  const gatePassDiv = detailsContent.querySelector(".gate-pass-card");
  if (!gatePassDiv) return alert("Gate pass not available");

  const statusEl = document.getElementById("emailStatus");
  statusEl.style.display = "block";
  statusEl.style.color = "blue";
  statusEl.textContent = `Sending gate pass to ${email}...`;

  try {
    // Capture gate pass as image
    const imgData = await captureDivAsImage(gatePassDiv);

    // Prepare email payload
  const payload = prepareGatePassEmailPayload({
  ...data,
  photo: imgData,
  email,
  visit_date: data.visit_date || data.date,  // ✅ always send as visit_date
});



    // Send to backend
    const res = await fetch(`${API_URL}/sendGatePass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const resp = await res.json();

    if (res.ok) {
      statusEl.style.color = "green";
      statusEl.textContent = `✅ Gate pass sent to ${email} successfully!`;
    } else {
      statusEl.style.color = "red";
      statusEl.textContent = `❌ Failed to send gate pass: ${resp.error || "Unknown error"}`;
    }
  } catch (err) {
    console.error(err);
    statusEl.style.color = "red";
    statusEl.textContent = `❌ Error sending gate pass: ${err.message}`;
  } finally {
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 4000);
  }
}

// ============================
// Capture div as image
// ============================
async function captureDivAsImage(div) {
  const canvas = await html2canvas(div);
  return canvas.toDataURL("image/png");
}

// ============================
// Initialize dashboard
// ============================
loadVisitors();
