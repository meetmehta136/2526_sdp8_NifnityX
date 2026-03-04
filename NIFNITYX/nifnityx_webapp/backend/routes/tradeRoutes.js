import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  receiveSignal,
  approveTrade,
  exitTrade,
  rejectTrade,
  updateTradeStatus,
  getTrades,
  getTradeById,
  getDashboardStats,
  getAccountSummary,
  getAnalytics
} from "../controllers/tradeController.js";

const router = express.Router();

// ── Public: Python Engine ──
router.post("/signal", receiveSignal);
router.post("/update", updateTradeStatus); // Protected via x-python-secret header

// ── Protected: Frontend (User) ──
router.get("/stats", protect, getDashboardStats);
router.get("/account-summary", protect, getAccountSummary);
router.get("/analytics", protect, getAnalytics);
router.post("/:id/approve", protect, approveTrade);
router.post("/:id/exit", protect, exitTrade);
router.post("/:id/reject", protect, rejectTrade);
router.get("/", protect, getTrades);
router.get("/:id", protect, getTradeById);

export default router;