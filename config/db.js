import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let primaryConnection;
let secondaryConnection;

export const connectDB = async () => {
  if (primaryConnection) return primaryConnection;

  try {
    primaryConnection = await mongoose.connect(process.env.MONGODB_URI);
    console.log("Primary DB connected");
    return primaryConnection;
  } catch (err) {
    console.error("Primary DB connection error:", err);
    process.exit(1);
  }
};

export const connectDB2 = async () => {
  if (secondaryConnection) return secondaryConnection;

  return new Promise((resolve, reject) => {
    const conn = mongoose.createConnection(process.env.MONGODB_URI2);

    conn.once("connected", () => {
      console.log("Secondary DB connected");
      secondaryConnection = conn;
      resolve(conn);
    });

    conn.on("error", (err) => {
      console.error("Secondary DB connection error:", err);
      reject(err);
    });
  });
};
