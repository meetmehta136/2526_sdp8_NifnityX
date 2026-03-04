import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getUserStrategy,
  updateUserStrategy,
  getEngineConfig,
  getActiveStrategy,
  setActiveStrategy,
} from "../controllers/StrategyController.js";

const router = express.Router();

// --- PUBLIC ENDPOINT FOR MEET (PYTHON) ---
// This allows his script to pull the latest config (Risk/Mode)
router.get("/engine-config", getEngineConfig);

// --- ACTIVE STRATEGY PROXY (React ↔ Node.js ↔ Python) ---
router.get("/active", protect, getActiveStrategy);
router.put("/active", protect, setActiveStrategy);

// --- PROTECTED FRONTEND ROUTES ---
router.get("/", protect, getUserStrategy);
router.put("/", protect, updateUserStrategy);

export default router;