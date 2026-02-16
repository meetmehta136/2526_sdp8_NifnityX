import Strategy from "../models/Strategy.js";

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
    // In a single-user system, we fetch the Admin's config
    // Or simpler: fetch the most recently updated config
    const strategy = await Strategy.findOne().sort({ updatedAt: -1 });

    if (!strategy) {
      return res.status(404).json({ message: "No active configuration found" });
    }

    // Return only what the Python Engine needs
    res.json({
      execution_mode: strategy.execution_mode,
      allowed_strategies: strategy.active_strategies,
      risk_limits: strategy.risk_settings,
      filters: strategy.model_filters
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Engine config error" });
  }
};