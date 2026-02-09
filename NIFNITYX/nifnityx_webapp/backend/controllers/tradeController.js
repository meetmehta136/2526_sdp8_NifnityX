import Trade from "../models/Trade.js";
import User from "../models/User.js";

// @desc    Receive Webhook from Python ML Engine
// @route   POST /api/trades/webhook
export const receiveWebhookSignal = async (req, res) => {
  try {
    const signalData = req.body;
    console.log(`\n📩 [Webhook] Signal Received: ${signalData.symbol} (${signalData.trade_id})`);

    // 1. Validation
    if (!signalData.trade_id || !signalData.symbol || !signalData.entry) {
      return res.status(400).json({ message: "Invalid signal data" });
    }

    // 2. Real-time Broadcast
    req.io.emit("new-trade-signal", signalData);

    // 3. Save to Database as PENDING
    // We strictly check if it exists to avoid overwrites
    const exists = await Trade.findOne({ trade_id: signalData.trade_id });
    if (exists) {
        return res.status(200).json({ message: "Duplicate signal logged" });
    }

    // Try to assign to an admin user for record-keeping
    const adminUser = await User.findOne({ role: "admin" });

    const newTrade = new Trade({
      ...signalData,
      user: adminUser ? adminUser._id : null, 
      status: signalData.status || "PENDING_APPROVAL", // Default state
      is_paper: true,
    });

    await newTrade.save();
    console.log(`💾 [DB] Trade ${signalData.trade_id} saved as PENDING`);

    res.status(200).json({ success: true, message: "Signal processed" });

  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// @desc    Update Trade Status (Approve/Reject/Expire)
// @route   PUT /api/trades/:tradeId/decision
export const updateTradeDecision = async (req, res) => {
  const { tradeId } = req.params;
  const { decision, reason } = req.body; // decision: "OPEN" | "REJECTED" | "EXPIRED"

  try {
    const trade = await Trade.findOne({ trade_id: tradeId });

    if (!trade) {
      return res.status(404).json({ message: "Trade not found" });
    }

    // State Machine Check: Can only decide on Pending trades
    if (trade.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: `Trade is already ${trade.status}` });
    }

    // Update Status
    trade.status = decision;
    if (reason) trade.exit = { ...trade.exit, reason: reason }; // Log rejection reason

    // TODO: If decision === "OPEN" && !trade.is_paper, Trigger Angel One Order Here

    await trade.save();
    console.log(`📝 [Decision] Trade ${tradeId} updated to ${decision}`);

    res.status(200).json(trade);
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Failed to update trade decision" });
  }
};

// @desc    Get Trade History
// @route   GET /api/trades
export const getTrades = async (req, res) => {
  try {
    const { status, mode, limit } = req.query;
    const query = { 
        $or: [
            { user: req.user._id },
            { user: null } 
        ]
    };

    if (status) {
        if (status.includes(',')) {
            query.status = { $in: status.split(',') };
        } else {
            query.status = status;
        }
    }

    if (mode === 'paper') query.is_paper = true;
    if (mode === 'live') query.is_paper = false;

    const trades = await Trade.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 100);

    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Dashboard Statistics
// @route   GET /api/trades/stats
export const getDashboardStats = async (req, res) => {
    try {
        const stats = await Trade.aggregate([
          { 
              $group: {
                  _id: null,
                  totalTrades: { $sum: 1 },
                  totalPnL: { $sum: "$pnl" },
                  wins: { $sum: { $cond: [{ $eq: ["$status", "WIN"] }, 1, 0] } },
                  losses: { $sum: { $cond: [{ $eq: ["$status", "LOSS"] }, 1, 0] } },
                  // Rejected/Expired are tracked but don't count towards Win/Loss
                  rejected: { $sum: { $cond: [{ $in: ["$status", ["REJECTED", "EXPIRED"]] }, 1, 0] } }
              }
          }
        ]);
        const result = stats[0] || { totalTrades: 0, totalPnL: 0, wins: 0, losses: 0, rejected: 0 };
        const closedTrades = result.wins + result.losses;
        const winRate = closedTrades > 0 ? ((result.wins / closedTrades) * 100).toFixed(1) : 0;
        res.json({ ...result, winRate: Number(winRate) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};