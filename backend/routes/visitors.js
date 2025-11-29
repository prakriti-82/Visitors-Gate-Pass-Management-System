import express from "express";
import db from "../db.js";
import crypto from "crypto";
import { sendGatePassEmail } from "../mail.js";

const router = express.Router();

/* -------------------- Filter Visitors & Vendors -------------------- */
router.get("/filter", (req, res) => {
  const { date, month } = req.query;
  let visitorCondition = "";
  let vendorCondition = "";
  let params = [];

  if (date) {
    visitorCondition = "WHERE vi.visit_date = ?";
    vendorCondition = "WHERE ve.visit_date = ?";
    params = [date, date];
  } else if (month) {
    visitorCondition = "WHERE DATE_FORMAT(vi.visit_date,'%Y-%m') = ?";
    vendorCondition = "WHERE DATE_FORMAT(ve.visit_date,'%Y-%m') = ?";
    params = [month, month];
  }

  const visitorQuery = `
    SELECT 
      'Visitor' AS visitor_type,
      v.aadhaar,
      v.name,
      v.address,
      v.photo,
      (SELECT COUNT(*) FROM visits WHERE visitor_id = v.id) AS total_visits,
      MAX(vi.visit_date) AS last_visit,
      MAX(vi.time_in) AS last_in_time,
      MAX(vi.time_out) AS last_out_time,
      MAX(vi.generated_by) AS generated_by,
      MAX(vi.meet_to) AS meet_to,
      MAX(vi.building) AS building,
      MAX(vi.equipment) AS equipment,
      MAX(vi.persons) AS persons,
      MAX(vi.gate_pass_no) AS gate_pass_no,
      MAX(vi.accompanying_names) AS accompanying_names
    FROM visitors v
    LEFT JOIN visits vi ON v.id = vi.visitor_id
    ${visitorCondition}
    GROUP BY v.id
  `;

  const vendorQuery = `
    SELECT 
      'Vendor' AS visitor_type,
      vd.aadhaar,
      vd.name,
      vd.address,
      vd.photo,
      (SELECT COUNT(*) FROM vendor_entries WHERE vendor_id = vd.id) AS total_visits,
      MAX(ve.visit_date) AS last_visit,
      MAX(ve.time_in) AS last_in_time,
      MAX(ve.time_out) AS last_out_time,
      MAX(ve.generated_by) AS generated_by,
      MAX(ve.meet_to) AS meet_to,
      MAX(ve.building) AS building,
      MAX(ve.equipment) AS equipment,
      MAX(ve.persons) AS persons,
      MAX(ve.gate_pass_no) AS gate_pass_no,
      MAX(ve.accompanying_names) AS accompanying_names
    FROM vendors vd
    LEFT JOIN vendor_entries ve ON vd.id = ve.vendor_id
    ${vendorCondition}
    GROUP BY vd.id
  `;

  const sql = `${visitorQuery} UNION ALL ${vendorQuery} ORDER BY last_visit DESC`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

/* -------------------- Visitor History -------------------- */
router.get("/history/:aadhar", (req, res) => {
  const { aadhar } = req.params;
  db.query(
    `SELECT vi.visit_date, vi.time_in, vi.time_out, vi.generated_by, vi.meet_to, 
            vi.building, vi.equipment, vi.persons, vi.gate_pass_no, vi.accompanying_names
     FROM visits vi 
     JOIN visitors v ON v.id = vi.visitor_id
     WHERE v.aadhaar = ? 
     ORDER BY vi.visit_date DESC`,
    [aadhar],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

/* -------------------- Vendor History -------------------- */
router.get("/vendor-history/:aadhar", (req, res) => {
  const { aadhar } = req.params;
  db.query(
    `SELECT ve.visit_date, ve.time_in, ve.time_out, ve.generated_by, ve.meet_to, 
            ve.building, ve.equipment, ve.persons, ve.gate_pass_no, ve.accompanying_names
     FROM vendor_entries ve 
     JOIN vendors vd ON vd.id = ve.vendor_id
     WHERE vd.aadhaar = ? 
     ORDER BY ve.visit_date DESC`,
    [aadhar],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

/* -------------------- Reopen Gate Pass -------------------- */
router.get("/reopen/:type/:aadhar/:gatePassNo", (req, res) => {
  const { type, aadhar, gatePassNo } = req.params;

  const isVendor = type.toLowerCase() === "vendor";
  const query = isVendor
    ? `SELECT vd.aadhaar, vd.name, vd.address, vd.photo, ve.visit_date, ve.time_in, ve.time_out, ve.generated_by,
              ve.meet_to, ve.building, ve.equipment, ve.persons, ve.gate_pass_no, ve.accompanying_names
       FROM vendor_entries ve 
       JOIN vendors vd ON vd.id = ve.vendor_id
       WHERE vd.aadhaar = ? AND ve.gate_pass_no = ? LIMIT 1`
    : `SELECT v.aadhaar, v.name, v.address, v.photo, vi.visit_date, vi.time_in, vi.time_out, vi.generated_by,
              vi.meet_to, vi.building, vi.equipment, vi.persons, vi.gate_pass_no, vi.accompanying_names
       FROM visits vi 
       JOIN visitors v ON v.id = vi.visitor_id
       WHERE v.aadhaar = ? AND vi.gate_pass_no = ? LIMIT 1`;

  db.query(query, [aadhar, gatePassNo], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length)
      return res.status(404).json({ error: "Gate pass not found" });
    res.json(results[0]);
  });
});

/* -------------------- Send Gate Pass Email -------------------- */
/* -------------------- Send Gate Pass Email -------------------- */
router.post("/sendGatePass", async (req, res) => {
  try {
    const gatePassData = req.body;
    if (!gatePassData)
      return res.status(400).json({ error: "Missing gate pass details" });

    // ✅ Define recipients
    const recipients = ["sidhikumari562@gmail.com"];
    if (gatePassData.building?.toLowerCase() === "plant") {
      recipients.push("hse@company.com");
    }
    if (gatePassData.extraEmail) {
      recipients.push(
        ...gatePassData.extraEmail
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
      );
    }

    // ✅ Normalize visit_date to handle DD/MM/YYYY, DD-MM-YYYY, and ISO formats
    let normalizedDate = null;
    if (gatePassData.visit_date) {
      const parsedDate = new Date(gatePassData.visit_date);
      if (!isNaN(parsedDate)) {
        normalizedDate = parsedDate.toISOString().split("T")[0];
      } else {
        const parts = gatePassData.visit_date.split(/[\/\-]/);
        if (parts.length === 3) {
          const [day, month, year] = parts.map(Number);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            normalizedDate = new Date(year, month - 1, day)
              .toISOString()
              .split("T")[0];
          }
        }
      }
    }

    // ✅ Fallback to today if invalid or missing
    if (!normalizedDate) normalizedDate = new Date().toISOString().split("T")[0];

    // ✅ Build payload to send
    const payload = {
      ...gatePassData,
      visitor_type: gatePassData.visitor_type || "Visitor",
      visit_date: normalizedDate,
    };

    // ✅ Send email
    await sendGatePassEmail(recipients.join(","), payload);

    res.json({
      success: true,
      message: `Gate pass sent to ${recipients.join(", ")}`,
    });
  } catch (err) {
    console.error("Error resending gate pass:", err);
    res.status(500).json({ error: "Failed to resend gate pass" });
  }
});


/* -------------------- Add Visitor / Vendor -------------------- */
router.post("/add", (req, res) => {
  const {
    aadhar, name, address, generatedBy, meetTo, date, inTime, outTime,
    building, equipment, persons, accompanyingNames, visitorType, extraEmail
  } = req.body;

  const visitDate = date || new Date().toISOString().slice(0, 10);
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  const gatePassNo = `GP-${datePart}-${randomStr}`;

  const entryToken = crypto.randomBytes(16).toString("hex");
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const insertVisit = (table, refId, refField, id) => {
    const sql = `
      INSERT INTO ${table} 
      (${refField}, visit_date, time_in, time_out, generated_by, meet_to, 
       building, equipment, persons, gate_pass_no, accompanying_names, entry_token, token_expiry)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      id, visitDate, inTime || null, outTime || null, generatedBy, meetTo || null,
      building || null, equipment || null, persons || 1, gatePassNo,
      accompanyingNames ? accompanyingNames.join(", ") : null,
      entryToken, tokenExpiry,
    ];

    db.query(sql, values, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      const selectQuery = `
        SELECT ${visitorType === "vendor" ? "vd" : "v"}.*,
               ${visitorType === "vendor" ? "ve" : "vi"}.* 
        FROM ${table} ${visitorType === "vendor" ? "ve" : "vi"}
        JOIN ${visitorType === "vendor" ? "vendors vd" : "visitors v"} 
        ON ${visitorType === "vendor" ? "vd.id=ve.vendor_id" : "v.id=vi.visitor_id"}
        WHERE ${visitorType === "vendor" ? "ve" : "vi"}.gate_pass_no = ? LIMIT 1
      `;

      db.query(selectQuery, [gatePassNo], async (err2, results) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const details = results[0];
        const recipients = ["sidhikumari562@gmail.com"];
        if (details.building?.toLowerCase() === "plant") recipients.push("hse@company.com");
        if (extraEmail) recipients.push(...extraEmail.split(",").map((e) => e.trim()).filter(Boolean));

        const payload = { ...details, visitor_type: visitorType === "vendor" ? "Vendor" : "Visitor" };
        try {
          await sendGatePassEmail(recipients.join(","), payload);
        } catch (emailErr) {
          console.error("Email sending error:", emailErr);
        }

        res.json({ message: `${visitorType} visit recorded`, gatePassNo, token: entryToken });
      });
    });
  };

  const table = visitorType === "vendor" ? "vendor_entries" : "visits";
  const refTable = visitorType === "vendor" ? "vendors" : "visitors";
  const refField = visitorType === "vendor" ? "vendor_id" : "visitor_id";

  db.query(`SELECT id, name, address FROM ${refTable} WHERE aadhaar=?`, [aadhar], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length) {
      const existing = result[0];
      if (existing.name !== name || existing.address !== address)
        return res.status(400).json({ error: "Aadhaar already exists with different data!" });
      insertVisit(table, refTable, refField, existing.id);
    } else {
      db.query(`INSERT INTO ${refTable} (aadhaar,name,address) VALUES (?,?,?)`, [aadhar, name, address], (err2, result2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        insertVisit(table, refTable, refField, result2.insertId);
      });
    }
  });
});

export default router;
