import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["sale", "payment", "return"], required: true },
    invoiceNo: String,
    originalTransactionId: { type: mongoose.Schema.Types.ObjectId },
    items: [
      {
        product: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        price: Number,
      },
    ],
    total: Number,
    refundAmount: Number,
    fullReturn: Boolean,
    paymentMethod: String,
    customer: Object,
    debit: Number,
    credit: Number,
    user: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

export default transactionSchema;
