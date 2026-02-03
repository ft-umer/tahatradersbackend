import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    role: { type: String, enum: ["customer", "walkIn"], default: "customer" },
  },
  { timestamps: true },
);

export default mongoose.model("Customer", CustomerSchema);
