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
      enum: ["PENDING_APPROVAL", "OPEN", "WIN", "LOSS", "REJECTED", "EXPIRED"],
      required: true,
      default: "PENDING_APPROVAL",
    },
    symbol: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ["BUY", "SELL"],
      default: "BUY",
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
    // --- ANALYTICS: Friction / Cost Data (from Python Engine) ---
    gross_pnl: {
      type: Number,
      default: 0,
    },
    total_costs: {
      type: Number,
      default: 0,
    },
    cost_breakdown: {
      type: Object,
      default: {},
    },
    // --- STRATEGY WORKAROUND: Future multi-strategy support ---
    strategy_name: {
      type: String,
      default: "3-Layer System",
    },
    // Updated Confidence Structure
    confidence_score: {
      total: { type: Number, required: true },
      max: { type: Number, default: 120 },
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
    
    // ═══════════════════════════════════════════════════════════
    // NEW FIELDS FOR MANUAL MODE + SLIPPAGE PROTECTION
    // ═══════════════════════════════════════════════════════════
    
    // Signal metadata (price at signal generation time)
    signal_time: {
      type: Date,
      description: "Timestamp when the signal was generated"
    },
    signal_price: {
      type: Number,
      description: "Option price at the moment signal was created (for slippage calculation)"
    },
    
    // Individual layer scores
    layer1_score: {
      type: Number,
      default: 0,
      description: "Technical analysis score (Layer 1)"
    },
    layer2_score: {
      type: Number,
      default: 0,
      description: "Sentiment score (Layer 2)"
    },
    layer3_score: {
      type: Number,
      default: 0,
      description: "ML model score (Layer 3)"
    },
    
    // Threshold information
    threshold_used: {
      type: Number,
      description: "Minimum threshold score that was passed to trigger the trade"
    },
    
    // Slippage tracking
    slippage_pct: {
      type: Number,
      default: 0,
      description: "Actual slippage percentage calculated at approval time"
    },
    execution_price: {
      type: Number,
      description: "Actual execution price (may differ from signal_price)"
    },
    
    // Detailed rejection reason
    rejection_reason: {
      type: String,
      description: "Detailed reason for rejection (slippage limit exceeded, human rejected, etc.)"
    },
    
    // Signal expiration
    signal_expires_at: {
      type: Date,
      description: "Timestamp when the pending signal will expire"
    },
    
    // Auto mode flag (true = auto executed, false = manual approval)
    auto_mode: {
      type: Boolean,
      default: false,
      description: "Whether trade was executed in auto mode without human approval"
    },
    
    // Entry time (when trade was actually opened)
    entry_time: {
      type: Date,
      description: "Timestamp when trade was opened (after approval)"
    },
    
    // Exit time (when trade was closed)
    exit_time: {
      type: Date,
      description: "Timestamp when trade was closed"
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

// Index for signal expiration queries
tradeSchema.index({ status: 1, signal_expires_at: 1 });

// Index for efficient slippage queries
tradeSchema.index({ signal_price: 1, execution_price: 1 });

const Trade = mongoose.model("Trade", tradeSchema);

export default Trade;