import express from 'express';
import {
  getAttendanceByDate,
  biometricVerifyAndMark,
  manualMarkAttendance,
  bulkMarkAttendance,
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/date/:date', getAttendanceByDate);
router.post('/biometric-verify', biometricVerifyAndMark);
router.post('/manual', manualMarkAttendance);
router.post('/bulk-mark', bulkMarkAttendance);

export default router;
