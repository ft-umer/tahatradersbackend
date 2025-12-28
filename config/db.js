import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Primary DB connected");
  } catch (err) {
    console.error("Primary DB connection error:", err);
  }
};

// ✅ STORE SECONDARY CONNECTION
export const secondaryConnection = mongoose.createConnection(
  process.env.MONGODB_URI2
);

secondaryConnection.on("connected", () => {
  console.log("Secondary DB connected");
});
