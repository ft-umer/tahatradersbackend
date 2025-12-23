import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customer.js';
import transactionRoutes from './routes/transactions.js';
import ledgerRoutes from './routes/ledger.js';
import storeRoutes from './routes/store.js';
import expenseRoutes from './routes/expense.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/customers', customerRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/expenses', expenseRoutes);


app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
