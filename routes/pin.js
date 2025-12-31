import express from "express";
import {
  createPin,
  getPin,
  updatePin,
} from "../controllers/pinController.js";

const router = express.Router();

router.post("/", createPin);   // create pin ONCE
router.get("/", getPin);       // send pin
router.put("/", updatePin);    // update the ONLY pin

export default router;
