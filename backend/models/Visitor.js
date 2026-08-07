import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  visit_date: String,
  time_in: String,
  time_out: String,
  generated_by: String,
  meet_to: String,
  building: String,
  equipment: String,
  persons: { type: Number, default: 1 },
  gate_pass_no: String,
  accompanying_names: String,
  entry_token: String,
  token_expiry: Date,
}, { _id: false });

const visitorSchema = new mongoose.Schema({
  aadhaar: { type: String, required: true, unique: true },
  name: String,
  address: String,
  photo: String,
  visits: [visitSchema],
});

export default mongoose.model("Visitor", visitorSchema);