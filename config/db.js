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

export const connectDB2 = async () => {
  try {
    await mongoose.createConnection(process.env.MONGODB_URI2);
    console.log("Secondary DB connected");
  } catch (err) {
    console.error("Secondary DB connection error:", err);
  }
};
