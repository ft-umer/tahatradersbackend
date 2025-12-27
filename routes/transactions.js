import express from "express";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  returnTransaction,
  deleteTransaction,
  getReturns // ✅ import delete
} from "../controllers/transactionController.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createTransaction); // add new transaction
router.post("/return", protect, returnTransaction);
router.get("/returns", protect, getReturns); // get all returns
router.get("/", protect, admin, getTransactions); // all transactions
router.put("/:id", protect, admin, updateTransaction); // update transaction
router.delete("/:id", protect, admin, deleteTransaction); // ✅ delete transaction

export default router;
