import mongoose from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    // Optional user link (Python script won't have a User ID)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // Unique ID from the Python Engine
    trade_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING_APPROVAL", "OPEN", "WIN", "LOSS", "REJECTED"],
      required: true,
      default: "PENDING_APPROVAL",
    },
    symbol: {
      type: String,
      required: true,
    },
    setup_name: {
      type: String,
      required: true,
    },
    entry: {
      price: { type: Number, required: true },
      time: { type: Date, required: true },
      stop_loss: { type: Number, default: 0 },
    },
    exit: {
      price: { type: Number, default: 0 },
      time: { type: Date },
      reason: { type: String },
    },
    pnl: {
      type: Number,
      default: 0,
    },
    pnl_percentage: {
      type: Number,
      default: 0,
    },
    // Updated Confidence Structure
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
      type: String,
      default: "1.0x",
    },
    execution_mode: {
      type: String,
      enum: ["PAPER", "LIVE"],
      default: "PAPER",
    },
    broker_order_id: {
      type: String,
    },
    // Slippage & trade constraints
    constraints: {
      type: Object,
      default: { slippage_per: 0.5 },
    },
    // Lifecycle audit log
    logs: [
      {
        message: { type: String },
        time: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Optimize for History Page sorting
tradeSchema.index({ createdAt: -1 });

const Trade = mongoose.model("Trade", tradeSchema);

export default Trade;