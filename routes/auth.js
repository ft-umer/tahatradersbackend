import express from "express";
import { login, register, getMe,forgotPassword,resetPassword } from "../controllers/authController.js";
import {protect} from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe); // <-- ADD THIS
// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
