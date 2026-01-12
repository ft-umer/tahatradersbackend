import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["sale", "payment", "return"],
    required: true,
  },

  invoiceNo: { type: String },

  // 🔗 LINK TO ORIGINAL SALE (FOR RETURNS)
  originalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
  },

  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      price: Number,
    },
  ],

  total: { type: Number, required: true },

  // 💰 RETURN-SPECIFIC FIELDS
  refundAmount: { type: Number, default: 0 },
  fullReturn: { type: Boolean, default: false },

  paymentMethod: { 
    type: String, 
    enum: ["cash", "online", "credit", "split", "received"], 
    required: true 
  },

  // Split payment fields
  cash: { type: Number, default: 0 },
  online: { type: Number, default: 0 },

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
