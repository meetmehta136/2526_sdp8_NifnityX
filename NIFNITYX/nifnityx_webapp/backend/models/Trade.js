import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Unique ID from the Python Engine (e.g., T-20260109-01)
    trade_id: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "WIN", "LOSS", "PENDING_APPROVAL", "REJECTED", "CANCELLED"],
      required: true,
      default: "PENDING_APPROVAL",
    },
    symbol: {
      type: String,
      required: true, // e.g., "NIFTY 25800 CE"
    },
    setup_name: {
      type: String,
      required: true, // e.g., "trend_bounce_sell"
    },
    // Entry details
    entry: {
      price: { type: Number, required: true },
      time: { type: Date, required: true },
    },
    // Exit details (Optional at creation)
    exit: {
      price: { type: Number },
      time: { type: Date },
      reason: { type: String }, // e.g., "TARGET_HIT", "STOP_LOSS"
    },
    pnl: {
      type: Number,
      default: 0,
    },
    // The ML Confidence breakdown
    confidence_score: {
      total: { type: Number, required: true },
      max: { type: Number, default: 100 },
      breakdown: {
        technical: { type: Number, default: 0 },
        sentiment: { type: Number, default: 0 },
        ml_model: { type: Number, default: 0 },
      },
    },
    lots: {
      type: Number,
      default: 1,
    },
    ml_adjustment: {
      type: String, // e.g., "0.75x"
      default: "1.0x",
    },
    // Meta fields for our internal logic
    execution_mode: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: "MANUAL",
    },
    is_paper: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for faster dashboard queries
tradeSchema.index({ user: 1, status: 1 });
tradeSchema.index({ trade_id: 1 });

const Trade = mongoose.model("Trade", tradeSchema);
export default Trade;