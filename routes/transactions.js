import express from "express";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  returnTransaction,
  deleteTransaction,
  getReturns,
  getTransactionById,
  addPaymentAgainstInvoice,
  addCreditAgainstInvoice,
  getStockMovements, // ✅ import delete
} from "../controllers/transactionController.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createTransaction); // add new transaction
router.post("/return", protect, returnTransaction);
router.post("/payment", addPaymentAgainstInvoice);
router.post("/credit", addCreditAgainstInvoice); // ✅ route for delete
router.get("/returns", protect, getReturns); // get all returns
router.get("/", protect, admin, getTransactions); // all transactions
router.get("/stock-movements", protect, admin, getStockMovements) // stock details
router.put("/:id", protect, admin, updateTransaction); // update transaction

router.delete("/:id", protect, admin, deleteTransaction); // ✅ delete transaction
router.get("/:id", protect, getTransactionById); // 👈 ADD THIS

export default router;
