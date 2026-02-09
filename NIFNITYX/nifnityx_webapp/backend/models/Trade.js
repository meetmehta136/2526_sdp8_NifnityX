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
      index: true
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "WIN", "LOSS", "PENDING_APPROVAL", "REJECTED", "CANCELLED", "EXPIRED"],
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
    // Updated Confidence Structure
    confidence_score: {
      total: { type: Number, required: true },
      max: { type: Number, default: 100 }, // Support for 160 scale
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
      enum: ["AUTO", "MANUAL"],
      default: "MANUAL",
    },
    is_paper: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize for History Page sorting
tradeSchema.index({ createdAt: -1 });

const Trade = mongoose.model("Trade", tradeSchema);

export default Trade;