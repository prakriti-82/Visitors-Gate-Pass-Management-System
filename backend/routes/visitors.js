import express from "express";
import crypto from "crypto";
import Visitor from "../models/Visitor.js";
import Vendor from "../models/Vendor.js";
import { sendGatePassEmail } from "../mail.js";

const router = express.Router();

/* -------------------- Filter Visitors & Vendors -------------------- */
router.get("/filter", async (req, res) => {
  try {
    const { date, month } = req.query;

    const [visitorDocs, vendorDocs] = await Promise.all([
      Visitor.find({}),
      Vendor.find({}),
    ]);

    const matchesFilter = (visitDate) => {
      if (!visitDate) return !date && !month;
      if (date) return visitDate === date;
      if (month) return visitDate.startsWith(month); // month = "YYYY-MM"
      return true;
    };

    const results = [];

    for (const v of visitorDocs) {
      const filteredVisits = v.visits.filter((vi) => matchesFilter(vi.visit_date));
      if (!filteredVisits.length) continue;
      const last = filteredVisits[filteredVisits.length - 1];
      results.push({
        visitor_type: "Visitor",
        aadhaar: v.aadhaar,
        name: v.name,
        address: v.address,
        photo: v.photo,
        total_visits: v.visits.length,
        last_visit: last.visit_date,
        last_in_time: last.time_in,
        last_out_time: last.time_out,
        generated_by: last.generated_by,
        meet_to: last.meet_to,
        building: last.building,
        equipment: last.equipment,
        persons: last.persons,
        gate_pass_no: last.gate_pass_no,
        accompanying_names: last.accompanying_names,
      });
    }

    for (const vd of vendorDocs) {
      const filteredEntries = vd.entries.filter((e) => matchesFilter(e.visit_date));
      if (!filteredEntries.length) continue;
      const last = filteredEntries[filteredEntries.length - 1];
      results.push({
        visitor_type: "Vendor",
        aadhaar: vd.aadhaar,
        name: vd.name,
        address: vd.address,
        photo: vd.photo,
        total_visits: vd.entries.length,
        last_visit: last.visit_date,
        last_in_time: last.time_in,
        last_out_time: last.time_out,
        generated_by: last.generated_by,
        meet_to: last.meet_to,
        building: last.building,
        equipment: last.equipment,
        persons: last.persons,
        gate_pass_no: last.gate_pass_no,
        accompanying_names: last.accompanying_names,
      });
    }

    results.sort((a, b) => (b.last_visit || "").localeCompare(a.last_visit || ""));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- Visitor History -------------------- */
router.get("/history/:aadhar", async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ aadhaar: req.params.aadhar });
    if (!visitor) return res.json([]);
    const sorted = [...visitor.visits].sort((a, b) =>
      (b.visit_date || "").localeCompare(a.visit_date || "")
    );
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- Vendor History -------------------- */
router.get("/vendor-history/:aadhar", async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ aadhaar: req.params.aadhar });
    if (!vendor) return res.json([]);
    const sorted = [...vendor.entries].sort((a, b) =>
      (b.visit_date || "").localeCompare(a.visit_date || "")
    );
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- Reopen Gate Pass -------------------- */
router.get("/reopen/:type/:aadhar/:gatePassNo", async (req, res) => {
  try {
    const { type, aadhar, gatePassNo } = req.params;
    const isVendor = type.toLowerCase() === "vendor";

    if (isVendor) {
      const vendor = await Vendor.findOne({ aadhaar: aadhar });
      const entry = vendor?.entries.find((e) => e.gate_pass_no === gatePassNo);
      if (!vendor || !entry)
        return res.status(404).json({ error: "Gate pass not found" });
      return res.json({
        aadhaar: vendor.aadhaar,
        name: vendor.name,
        address: vendor.address,
        photo: vendor.photo,
        ...entry.toObject(),
      });
    } else {
      const visitor = await Visitor.findOne({ aadhaar: aadhar });
      const visit = visitor?.visits.find((v) => v.gate_pass_no === gatePassNo);
      if (!visitor || !visit)
        return res.status(404).json({ error: "Gate pass not found" });
      return res.json({
        aadhaar: visitor.aadhaar,
        name: visitor.name,
        address: visitor.address,
        photo: visitor.photo,
        ...visit.toObject(),
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- Send Gate Pass Email -------------------- */
router.post("/sendGatePass", async (req, res) => {
  try {
    const gatePassData = req.body;
    if (!gatePassData)
      return res.status(400).json({ error: "Missing gate pass details" });

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

    if (!normalizedDate) normalizedDate = new Date().toISOString().split("T")[0];

    const payload = {
      ...gatePassData,
      visitor_type: gatePassData.visitor_type || "Visitor",
      visit_date: normalizedDate,
    };

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
router.post("/add", async (req, res) => {
  try {
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

    const newEntry = {
      visit_date: visitDate,
      time_in: inTime || null,
      time_out: outTime || null,
      generated_by: generatedBy,
      meet_to: meetTo || null,
      building: building || null,
      equipment: equipment || null,
      persons: persons || 1,
      gate_pass_no: gatePassNo,
      accompanying_names: accompanyingNames ? accompanyingNames.join(", ") : null,
      entry_token: entryToken,
      token_expiry: tokenExpiry,
    };

    const isVendor = visitorType === "vendor";
    const Model = isVendor ? Vendor : Visitor;
    const listField = isVendor ? "entries" : "visits";

    let doc = await Model.findOne({ aadhaar: aadhar });

    if (doc) {
      if (doc.name !== name || doc.address !== address) {
        return res.status(400).json({ error: "Aadhaar already exists with different data!" });
      }
      doc[listField].push(newEntry);
      await doc.save();
    } else {
      doc = await Model.create({
        aadhaar: aadhar,
        name,
        address,
        [listField]: [newEntry],
      });
    }

    // Send confirmation email (non-blocking on failure)
    const recipients = ["sidhikumari562@gmail.com"];
    if (newEntry.building?.toLowerCase() === "plant") recipients.push("hse@company.com");
    if (extraEmail) recipients.push(...extraEmail.split(",").map((e) => e.trim()).filter(Boolean));

    const payload = {
      aadhaar: doc.aadhaar,
      name: doc.name,
      address: doc.address,
      photo: doc.photo,
      ...newEntry,
      visitor_type: isVendor ? "Vendor" : "Visitor",
    };

    try {
      await sendGatePassEmail(recipients.join(","), payload);
    } catch (emailErr) {
      console.error("Email sending error:", emailErr);
    }

    res.json({ message: `${visitorType} visit recorded`, gatePassNo, token: entryToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;