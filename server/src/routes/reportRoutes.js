import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getMonthlyMatrix,
  exportCSV,
} from "../controllers/reportController.js";

const router = express.Router();

router.use(protect);

router.get("/monthly", getMonthlyMatrix);
router.get("/export-csv", exportCSV);

export default router;
