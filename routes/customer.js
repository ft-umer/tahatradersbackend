import express from 'express';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getWalkInCustomer} from '../controllers/customerController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getCustomers);
router.post('/', protect, admin, createCustomer);
router.get('/walkin', getWalkInCustomer);
router.put('/:id', protect, admin, updateCustomer);
router.delete('/:id', protect, admin, deleteCustomer);

export default router;
