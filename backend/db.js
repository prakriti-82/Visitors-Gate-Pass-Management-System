import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config(); // Load .env file

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected ✅");
  } catch (err) {
    console.error("DB Connection Failed ❌", err);
    process.exit(1); // fail fast if DB is unreachable
  }
};

export default connectDB;