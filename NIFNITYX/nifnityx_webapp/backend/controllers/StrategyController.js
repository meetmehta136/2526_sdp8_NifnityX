import Strategy from "../models/Strategy.js";
import axios from "axios";

// Extract base origin from PYTHON_EXECUTION_URL (strip /execute path if present)
const _rawUrl = process.env.PYTHON_EXECUTION_URL || "http://localhost:8000";
const PYTHON_URL = (() => {
  try { return new URL(_rawUrl).origin; }
  catch { return "http://localhost:8000"; }
})();
const VALID_STRATEGIES = ["sniper", "balanced", "aggressive", "conservative"];

// ── Helper: sync saved strategy to Python engine ──────────────────────────────
async function syncStrategyToPython(strategyName) {
  try {
    const res = await axios.post(
      `${PYTHON_URL}/set_strategy`,
      { strategy: strategyName },
      { timeout: 5000 }
    );
    console.log(`✅ Python strategy synced → ${strategyName.toUpperCase()}`);
    return { synced: true, python: res.data };
  } catch (err) {
    console.warn(`⚠️  Could not sync strategy to Python: ${err.message}`);
    return { synced: false, error: err.message };
  }
}

// ── BOOT SYNC: call this on Node.js startup ───────────────────────────────────
// Reads saved strategy from MongoDB and pushes it to Python
// so the engine always starts with the Admin's last chosen strategy.
export const bootSyncStrategy = async () => {
  try {
    const config = await Strategy.findOne().sort({ updatedAt: -1 });
    if (config?.active_strategy) {
      console.log(`🔄 Boot sync: pushing saved strategy "${config.active_strategy}" to Python...`);
      await syncStrategyToPython(config.active_strategy);
    }
    if (config?.execution_mode) {
      const pythonUrl = process.env.PYTHON_EXECUTION_URL || "http://localhost:8000";
      const pythonBase = (() => { try { return new URL(pythonUrl).origin; } catch { return "http://localhost:8000"; } })();
      console.log(`⚙️  Boot sync: pushing execution mode "${config.execution_mode}" to Python...`);
      await axios.post(`${pythonBase}/set_mode`, { mode: config.execution_mode }, { timeout: 5000 }).catch(() => { });
    }
  } catch (err) {
    console.warn(`⚠️  Boot strategy sync failed: ${err.message}`);
  }
};

// @desc    Get Current Strategy Config (Frontend)
// @route   GET /api/strategies
export const getUserStrategy = async (req, res) => {
  try {
    let strategy = await Strategy.findOne({ user: req.user._id });

    // If no config exists, create a default one
    if (!strategy) {
      strategy = await Strategy.create({
        user: req.user._id,
        execution_mode: "MANUAL",
        active_strategy: "sniper",
        active_strategies: ["trend_bounce"],
      });
    }

    res.json(strategy);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update Strategy Config (Frontend)
// @route   PUT /api/strategies
export const updateUserStrategy = async (req, res) => {
  try {
    const { execution_mode, active_strategies, risk_settings, model_filters } = req.body;

    const strategy = await Strategy.findOne({ user: req.user._id });

    if (strategy) {
      strategy.execution_mode = execution_mode || strategy.execution_mode;
      strategy.active_strategies = active_strategies || strategy.active_strategies;
      strategy.risk_settings = { ...strategy.risk_settings, ...risk_settings };
      strategy.model_filters = { ...strategy.model_filters, ...model_filters };

      const updatedStrategy = await strategy.save();
      res.json(updatedStrategy);
    } else {
      res.status(404).json({ message: "Strategy config not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

// @desc    Public Config Endpoint for Python Engine (Meet)
// @route   GET /api/strategies/engine-config
// @access  Public (In production, use API Key)
export const getEngineConfig = async (req, res) => {
  try {
    const strategy = await Strategy.findOne().sort({ updatedAt: -1 });

    if (!strategy) {
      return res.status(404).json({ message: "No active configuration found" });
    }

    res.json({
      execution_mode: strategy.execution_mode,
      active_strategy: strategy.active_strategy,
      allowed_strategies: strategy.active_strategies,
      risk_limits: strategy.risk_settings,
      filters: strategy.model_filters
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Engine config error" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  NEW: Active Strategy Proxy Endpoints (React ↔ Node.js ↔ Python)
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Get active strategy + available list
// @route   GET /api/strategies/active
// @access  Private
export const getActiveStrategy = async (req, res) => {
  try {
    let config = await Strategy.findOne({ user: req.user._id });

    if (!config) {
      config = await Strategy.create({
        user: req.user._id,
        active_strategy: "sniper",
      });
    }

    // Optionally verify against Python
    let pythonStrategy = null;
    try {
      const pyRes = await axios.get(`${PYTHON_URL}/strategy`, { timeout: 3000 });
      pythonStrategy = pyRes.data?.active || null;
    } catch (_) {
      // Python may be offline — that's ok
    }

    res.json({
      active: config.active_strategy,
      available: VALID_STRATEGIES,
      python_active: pythonStrategy,
      python_synced: pythonStrategy === config.active_strategy,
    });
  } catch (error) {
    console.error("getActiveStrategy error:", error.message);
    res.status(500).json({ message: "Failed to fetch active strategy" });
  }
};

// @desc    Set active strategy (persist + hot-swap Python)
// @route   PUT /api/strategies/active
// @access  Private
export const setActiveStrategy = async (req, res) => {
  try {
    const { strategy } = req.body;

    if (!strategy || !VALID_STRATEGIES.includes(strategy.toLowerCase())) {
      return res.status(400).json({
        message: `Invalid strategy "${strategy}". Valid options: ${VALID_STRATEGIES.join(", ")}`,
      });
    }

    const normalised = strategy.toLowerCase();

    // 1. Persist to Strategy model (MongoDB) — use findOneAndUpdate to avoid
    //    full-document validation (existing execution_mode may be lowercase)
    const config = await Strategy.findOneAndUpdate(
      { user: req.user._id },
      { active_strategy: normalised },
      { upsert: true, new: true, runValidators: false }
    );

    // 2. Also update User model so /auth/me returns the correct profile
    try {
      const User = (await import("../models/User.js")).default;
      await User.findByIdAndUpdate(req.user._id, {
        "settings.strategy.profile": normalised,
      });
    } catch (userErr) {
      console.warn("⚠️  User model sync warning:", userErr.message);
    }

    // 3. Hot-swap Python engine
    const syncResult = await syncStrategyToPython(normalised);

    res.json({
      active: normalised,
      saved: true,
      python_synced: syncResult.synced,
      python_response: syncResult.python || null,
      warning: syncResult.synced ? undefined : "Strategy saved but Python engine is offline. It will sync on next bot start.",
    });
  } catch (error) {
    console.error("setActiveStrategy error:", error.message);
    res.status(500).json({ message: "Failed to update strategy" });
  }
};