import express from 'express';
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  enrollFace,
  enrollFingerprint,
  clearBiometrics,
  getKioskEnrolledStaff,
} from '../controllers/staffController.js';

const router = express.Router();

router.get('/', getAllStaff);
router.get('/kiosk/enrolled', getKioskEnrolledStaff);
router.get('/:id', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

// Biometric enrollment routes
router.post('/:id/enroll-face', enrollFace);
router.post('/:id/enroll-fingerprint', enrollFingerprint);
router.post('/:id/clear-biometrics', clearBiometrics);

export default router;
