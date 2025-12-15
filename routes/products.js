import express from 'express';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../config/multer.js';
const router = express.Router();


router.get('/', protect, getProducts);
router.post('/', protect, admin, upload.single('image'), addProduct);

router.delete('/:id', protect, admin, deleteProduct);
router.put('/:id', protect, admin, upload.single('image'), updateProduct);


export default router;
