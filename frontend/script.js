const API_URL = "http://localhost:3000/api/visitors";

// ============================
// Prepare gate pass payload for email
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
  image: photoData,
  summary: `${gatePassData.name} - Gate Pass ${gatePassData.gate_pass_no || "-"}`,
  gate_pass_no: gatePassData.gate_pass_no || "-",
  aadhaar: maskedAadhaar,
  visitor_type: gatePassData.type || gatePassData.visitorType || "Visitor",
  generated_by: gatePassData.generated_by || "-",
  meet_to: gatePassData.meet_to || "-",
  building: gatePassData.building || "-",
  equipment: gatePassData.equipment || "-",
  persons: gatePassData.persons || 1,
  accompanying_names: gatePassData.accompanying_names || "-",
  visit_date:
    gatePassData.date ||
    gatePassData.visit_date ||
    new Date().toISOString().slice(0, 10),
  time_in: gatePassData.inTime || gatePassData.time_in || "-",
  time_out: gatePassData.outTime || gatePassData.time_out || "-",
  note:
    gatePassData.building === "Plant"
      ? "⚠️ Please Visit HSE for Safety instructions"
      : "",
      aadhar_masked: gatePassData.aadhaar || "",
      address: gatePassData.address || "-",
      meetTo: gatePassData.meet_to || "-",
     
      extraEmail: gatePassData.extraEmail || "",
};
}
// ============================
// Capture a div as image
// ============================
async function captureDivAsImage(div) {
  const prevDisplay = div.style.display;
  div.style.display = "block";
  await new Promise((r) => setTimeout(r, 120));
  const canvas = await html2canvas(div, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
  });
  div.style.display = prevDisplay;
  return canvas.toDataURL("image/png");
}

// ============================
// Aadhaar formatting & validation
// ============================
const aadharInput = document.getElementById("aadhar");

aadharInput.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");
  if (value.length > 12) value = value.substring(0, 12);
  e.target.value = value.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
});

aadharInput.addEventListener("blur", async () => {
  const aadhar = aadharInput.value.replace(/\s+/g, "");
  if (aadhar.length !== 12) return;

  try {
    const res = await fetch(`${API_URL}/get-by-aadhar/${aadhar}`);
    const nameField = document.getElementById("name");
    const addressField = document.getElementById("address");

    if (res.ok) {
      const data = await res.json();

      if (data && data.name && data.address) {
        nameField.value = data.name;
        addressField.value = data.address;
        nameField.readOnly = true;
        addressField.readOnly = true;

        alert(
          `This Aadhaar already exists as a ${data.type}. Data has been autofilled.`
        );
        console.log("✅ Existing Aadhaar found. Autofilled.");
      }
    } else {
      nameField.value = "";
      addressField.value = "";
      nameField.readOnly = false;
      addressField.readOnly = false;
      console.log("ℹ️ New Aadhaar. Ready for entry.");
    }
  } catch (err) {
    console.error("❌ Error fetching Aadhaar details:", err);
  }
});

// ============================
// Form & gate pass logic
// ============================
const form = document.getElementById("visitorForm");
const gatePassDiv = document.getElementById("gatePass");
const passDetails = document.getElementById("passDetails");
const backBtn = document.getElementById("backBtn");
const personsInput = document.getElementById("persons");
const personsContainer = document.getElementById("personsContainer");
const visitorTypeSelect = document.getElementById("visitorType");

const photoInput = document.getElementById("visitorPhoto");
const photoPreview = document.getElementById("photoPreview");
const startCameraBtn = document.getElementById("startCamera");
const takePhotoBtn = document.getElementById("takePhoto");
const cameraVideo = document.getElementById("camera");

// Preview uploaded photo
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      photoPreview.src = reader.result;
      photoPreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    photoPreview.src = "";
    photoPreview.style.display = "none";
  }
});

// Camera controls
startCameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraVideo.srcObject = stream;
    cameraVideo.style.display = "block";
    takePhotoBtn.style.display = "inline-block";
    startCameraBtn.style.display = "none";
  } catch (err) {
    console.error("Error accessing camera:", err);
    alert("Could not access the camera.");
  }
});

takePhotoBtn.addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  canvas.getContext("2d").drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

  photoPreview.src = canvas.toDataURL("image/png");
  photoPreview.style.display = "block";

  const tracks = cameraVideo.srcObject.getTracks();
  tracks.forEach((track) => track.stop());
  cameraVideo.style.display = "none";
  takePhotoBtn.style.display = "none";
  startCameraBtn.style.display = "inline-block";
});

// Accompanying persons input boxes
personsInput.addEventListener("input", () => {
  const count = parseInt(personsInput.value) || 1;
  personsContainer.innerHTML = "";
  for (let i = 1; i <= count - 1; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Accompanying Person ${i}`;
    input.id = `person${i}`;
    input.required = true;
    personsContainer.appendChild(input);
    personsContainer.appendChild(document.createElement("br"));
  }
});

// Back button
backBtn.addEventListener("click", () => {
  gatePassDiv.style.display = "none";
  form.style.display = "block";
});

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const visitorType = visitorTypeSelect.value;
  const aadhar = aadharInput.value.replace(/\s+/g, "");
  if (aadhar.length !== 12) {
    alert("Aadhaar must be exactly 12 digits");
    aadharInput.focus();
    return;
  }

  const name = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const generatedBy = document.getElementById("generatedBy").value.trim();
  const meetTo = document.getElementById("meetTo").value.trim();
  const date = document.getElementById("date").value;
  const inTime = document.getElementById("inTime").value;
  const outTime = document.getElementById("outTime").value;
  const building = document.getElementById("building").value;
  const equipment = document.getElementById("equipment").value;
  const persons = parseInt(personsInput.value) || 1;
  const extraEmail = document.getElementById("extraEmail").value.trim(); // ✅ New extra email field

  const accompanyingNames = [];
  for (let i = 1; i <= persons - 1; i++) {
    const input = document.getElementById(`person${i}`);
    if (input && input.value.trim() !== "")
      accompanyingNames.push(input.value.trim());
  }

  try {
    const resCheck = await fetch(`${API_URL}/get-by-aadhar/${aadhar}`);
    if (resCheck.ok) {
      const dataCheck = await resCheck.json();
      if (dataCheck && (dataCheck.name !== name || dataCheck.address !== address)) {
        return alert(
          `This Aadhaar already exists as ${dataCheck.name}, ${dataCheck.address}. You cannot enter a different name or address.`
        );
      }
    }
  } catch (err) {
    console.error("Error verifying Aadhaar on submit:", err);
  }

  const maskedAadhar = "XXXXXXXX" + aadhar.slice(-4);
  const note =
    building === "Plant"
      ? "⚠️ Note:  Please Visit HSE for Safety instructions."
      : "";

  try {
    const res = await fetch(`${API_URL}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorType,
        aadhar,
        name,
        address,
        meetTo,
        date,
        inTime,
        outTime,
        building,
        equipment,
        persons,
        generatedBy,
        accompanyingNames,
        extraEmail, // ✅ Save extra recipient if added
      }),
    });

    const data = await res.json();
    if (res.ok) {
      passDetails.innerHTML = `
        ${photoPreview.src ? `<img src="${photoPreview.src}" alt="Visitor Photo" style="width:120px; display:block; margin-bottom:10px;">` : ""}
        <strong>Gate Pass No:</strong> ${data.gatePassNo}<br>
        <strong>Name:</strong> ${name}<br>
        <strong>Aadhar:</strong> ${maskedAadhar}<br>
        <strong>Type:</strong> ${visitorType === "vendor" ? "Vendor/Contractor" : "Visitor"}<br>
        <strong>Generated By:</strong> ${generatedBy}<br>
        <strong>Meeting With:</strong> ${meetTo}<br>
        <strong>Building:</strong> ${building}<br>
        <strong>Date:</strong> ${date}<br>
        <strong>In Time:</strong> ${inTime}, <strong>Out Time:</strong> ${outTime}<br>
        <strong>Accompanying:</strong> ${accompanyingNames.join(", ") || "-"}<br>
        ${note ? `<strong>${note}</strong>` : ""}
      `;
      gatePassDiv.style.display = "block";
      form.style.display = "none";
      form.reset();
      personsContainer.innerHTML = "";
      photoPreview.src = "";
      photoPreview.style.display = "none";
    } else {
      alert(data.error || "Failed to generate gate pass");
    }

    localStorage.setItem(
  "lastGatePass",
  JSON.stringify({
    gatePassNo: data.gatePassNo,
    name,
    aadhar,
    address,
    type: visitorType,
    meetTo,
    date,
    building,
    equipment,
    inTime,
    outTime,
    generated_by: generatedBy,
    persons,
    accompanying_names: accompanyingNames.join(", ") || "-",
    extraEmail,
    photo: photoPreview.src || null, // ✅ Save the image if any
  })
);

  } catch (err) {
    console.error(err);
    alert("Error generating gate pass");
  }
});

// Send to security
document.getElementById("sendMailBtn").addEventListener("click", async () => {
  try {
    const building = document.getElementById("building").value;
    const savedPass = JSON.parse(localStorage.getItem("lastGatePass"));
    if (!savedPass) return alert("No gate pass found to send!");

    const payload = prepareGatePassEmailPayload(savedPass, photoPreview);

    const res = await fetch("http://localhost:3000/api/visitors/sendGatePass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      alert(
        `Gate pass sent successfully to Security${
          building === "Plant" ? " and HSE" : ""
        }${payload.extraEmail ? " and extra recipients" : ""}`
      );
    } else {
      alert(data.error || "Failed to send gate pass");
    }
  } catch (err) {
    console.error(err);
    alert("Error sending gate pass: " + err.message);
  }
});

// Reopen last gate pass
document.getElementById("reopenBtn").addEventListener("click", () => {
  const saved = localStorage.getItem("lastGatePass");
  if (!saved) return alert("No recent gate pass found.");

  const data = JSON.parse(saved);
  passDetails.innerHTML = `
    <strong>Gate Pass No:</strong> ${data.gatePassNo}<br>
    <strong>Name:</strong> ${data.name}<br>
    <strong>Aadhar:</strong> ${
      data.aadhar ? "XXXXXXXX" + data.aadhar.slice(-4) : "-"
    }<br>
    <strong>Generated By:</strong> ${data.generated_by}<br>
    <strong>Type:</strong> ${
      data.type === "vendor" ? "Vendor/Contractor" : "Visitor"
    }<br>
    <strong>Meeting With:</strong> ${data.meetTo}<br>
    <strong>Date:</strong> ${data.date}<br>
    <strong>Building:</strong> ${data.building}<br>
    <strong>In:</strong> ${data.inTime}, <strong>Out:</strong> ${data.outTime}<br>
  `;
  gatePassDiv.style.display = "block";
  form.style.display = "none";
});
