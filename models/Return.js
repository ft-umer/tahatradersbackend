import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    customer: {
      name: { type: String },
      phone: { type: String },
    },

    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // optional but recommended
      },
    ],
    refundAmount: { type: Number, required: true },
    fullReturn: { type: Boolean, default: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // staff processing return
  },
  { timestamps: true }
);

export default mongoose.model("Return", returnSchema);
