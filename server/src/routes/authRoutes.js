import express from 'express';
import { registerOwner, loginOwner, getMe, updateSettings } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerOwner);
router.post('/login', loginOwner);
router.get('/me', protect, getMe);
router.put('/settings', protect, updateSettings);

export default router;
