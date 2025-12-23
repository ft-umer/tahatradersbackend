import express from 'express';
import Expense from '../models/Expense.js';
import {protect,admin} from '../middleware/auth.js';

const router = express.Router();

/* CREATE */
router.post('/', protect, async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* GET ALL */
router.get('/', protect, async (req, res) => {
  const expenses = await Expense.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(expenses);
});

/* DELETE */
router.delete('/:id', protect, async (req, res) => {
  await Expense.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });
  res.json({ success: true });
});

export default router;
