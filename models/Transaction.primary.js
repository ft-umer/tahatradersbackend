import mongoose from "mongoose";
import transactionSchema from "./Transaction.schema.js";

export default mongoose.model("Transaction", transactionSchema);
