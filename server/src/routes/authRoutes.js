import express from "express";
import {
  registerOwner,
  loginOwner,
  getMe,
  updateSettings,
  verifyKioskPassword,
  getKioskStatus,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerOwner);
router.post("/login", loginOwner);
router.get("/me", protect, getMe);
router.put("/settings", protect, updateSettings);
router.post("/verify-kiosk-password", protect, verifyKioskPassword);
router.get("/kiosk-status", protect, getKioskStatus);
router.put("/change-password", protect, changePassword);

export default router;
