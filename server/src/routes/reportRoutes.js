import express from 'express';
import { getMonthlyMatrix, exportCSV } from '../controllers/reportController.js';

const router = express.Router();

router.get('/monthly', getMonthlyMatrix);
router.get('/export-csv', exportCSV);

export default router;
