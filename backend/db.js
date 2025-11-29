import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config(); // Load .env file

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err) => {
  if (err) console.error("DB Connection Failed ❌", err);
  else console.log("DB Connected ✅");
});

export default db;

