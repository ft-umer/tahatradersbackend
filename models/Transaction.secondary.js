import { secondaryConnection } from "../config/db.js";
import transactionSchema from "./Transaction.schema.js";

export default secondaryConnection.model(
  "Transaction",
  transactionSchema
);
