import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getBrokerStatus,
  saveBrokerKeys,
  testConnection,
  updateTradingMode,
  getMarketStatus,
  getHistoricalData
} from "../controllers/brokerController.js";

const router = express.Router();

router.get("/status", protect, getBrokerStatus);
router.post("/keys", protect, saveBrokerKeys);
router.post("/test", protect, testConnection);
router.post("/mode", protect, updateTradingMode);
router.get("/market-status", protect, getMarketStatus);
router.get("/history", protect, getHistoricalData); // <--- New Route

export default router;