import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  handleTradeSignal,
  getTrades,
  getDashboardStats,
} from "../controllers/tradeController.js";

const router = express.Router();

// Base route: /api/trades

router.post("/signal", protect, handleTradeSignal); // The Webhook for Python
router.get("/", protect, getTrades);                // History Table
router.get("/stats", protect, getDashboardStats);   // Session HUD

export default router;