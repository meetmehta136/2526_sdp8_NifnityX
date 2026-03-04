import mongoose from "mongoose";

const strategySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One config per user
    },
    // The currently active Python engine strategy
    active_strategy: {
      type: String,
      enum: ["sniper", "balanced", "aggressive", "conservative"],
      default: "sniper",
    },
    // The Master Switch
    execution_mode: {
      type: String,
      enum: ["MANUAL", "AUTO"],
      default: "MANUAL",
    },
    // Strategies the Python Engine should look for
    active_strategies: [{
      type: String,
      // e.g., "trend_bounce", "gamma_scalp", "breakout"
    }],
    // Risk Management Rules
    risk_settings: {
      max_daily_loss: { type: Number, default: 5000 },
      risk_per_trade: { type: Number, default: 2000 },
      max_open_lots: { type: Number, default: 2 },
      stop_loss_buffer: { type: Number, default: 10 }, // Points
    },
    // Filters for incoming signals
    model_filters: {
      min_confidence_score: { type: Number, default: 60 },
      required_sentiment: { type: String, enum: ["BULLISH", "BEARISH", "NEUTRAL", "ANY"], default: "ANY" },
    },
    is_active: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

const Strategy = mongoose.model("Strategy", strategySchema);
export default Strategy;