import express from "express";
import { getStoreInfo, createStoreInfo, updateStoreInfo } from "../controllers/storeController.js";
import upload from "../config/multer.js";
import { protect,admin } from "../middleware/auth.js"; // optional

const router = express.Router();

// Public get store info
router.get("/", getStoreInfo);

// Protected routes for create and update
router.post("/", protect, admin, upload.single("logo"), createStoreInfo);
router.put("/", protect, admin, upload.single("logo"), updateStoreInfo);

export default router;
