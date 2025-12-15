import express from 'express';
import { getTransactions, createTransaction,updateTransaction } from '../controllers/transactionController.js';
import { protect, admin } from '../middleware/auth.js';
const router = express.Router();



router.post('/', protect, createTransaction); // add new transaction
router.get('/', protect, admin, getTransactions); // all transactions
router.put('/:id', protect, admin, updateTransaction); // update transaction

export default router;
