import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["sale", "payment","return"], required: true },
  invoiceNo: { type: String },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number, // store price at time of sale
    },
  ],
  total: { type: Number, required: true },
  paymentMethod: { type: String },
  customer: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: String,
  },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("Transaction", transactionSchema);
