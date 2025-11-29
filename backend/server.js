import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import visitorsRoutes from "./routes/visitors.js";
import db from "./db.js";

dotenv.config(); // Load .env variables

const app = express();
const PORT = process.env.PORT || 3000;

// ➡️ Middleware
app.use(cors());
// ✅ Allow larger payloads (needed for base64 images)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));


// ➡️ Test DB connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed ❌", err);
  } else {
    console.log("Database connected ✅");
    connection.release();
  }
});

// ➡️ Routes
app.use("/api/visitors", visitorsRoutes);

// ➡️ Default route
app.get("/", (req, res) => {
  res.send("Gate Pass Management API is running...");
});

// ➡️ Handle 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ➡️ Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ➡️ Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
