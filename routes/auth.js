import express from "express";
import { login, register, getMe } from "../controllers/authController.js";
import {protect} from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe); // <-- ADD THIS

export default router;
