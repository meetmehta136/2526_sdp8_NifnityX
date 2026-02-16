import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getUserStrategy,
  updateUserStrategy,
  getEngineConfig
} from "../controllers/StrategyController.js";

const router = express.Router();

// --- PUBLIC ENDPOINT FOR MEET (PYTHON) ---
// This allows his script to pull the latest config (Risk/Mode)
router.get("/engine-config", getEngineConfig);

// --- PROTECTED FRONTEND ROUTES ---
router.get("/", protect, getUserStrategy);
router.put("/", protect, updateUserStrategy);

export default router;