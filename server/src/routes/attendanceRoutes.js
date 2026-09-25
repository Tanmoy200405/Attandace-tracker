import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAttendanceByDate,
  biometricVerifyAndMark,
  manualMarkAttendance,
  bulkMarkAttendance,
  get30DaySummary,
} from "../controllers/attendanceController.js";

const router = express.Router();

router.use(protect);

router.get("/summary/30days", get30DaySummary);
router.get("/date/:date", getAttendanceByDate);
router.post("/biometric-verify", biometricVerifyAndMark);
router.post("/manual", manualMarkAttendance);
router.post("/bulk-mark", bulkMarkAttendance);

export default router;
