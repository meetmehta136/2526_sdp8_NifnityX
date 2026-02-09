import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  receiveWebhookSignal,
  updateTradeDecision,
  getTrades,
  getDashboardStats,
} from "../controllers/tradeController.js";

const router = express.Router();

// Public Webhook (Python Engine)
router.post("/webhook", receiveWebhookSignal); 

// Protected Frontend Routes
router.get("/", protect, getTrades);
router.get("/stats", protect, getDashboardStats);

// NEW: Route to handle User Decisions (Approve/Reject)
router.put("/:tradeId/decision", protect, updateTradeDecision);

export default router;