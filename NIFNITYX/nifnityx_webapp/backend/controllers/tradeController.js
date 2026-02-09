import Trade from "../models/Trade.js";
import User from "../models/User.js";

// @desc    Handle incoming Trade Signal from Python Bot (or Postman)
// @route   POST /api/trades/signal
// @access  Private (Protected by Token)
export const handleTradeSignal = async (req, res) => {
  try {
    const signalData = req.body;
    const userId = req.user._id;

    // 1. Fetch User Settings to determine execution logic
    const user = await User.findById(userId).select("settings");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { tradingMode, executionMode } = user.settings;

    // 2. Determine Status based on Modes
    let initialStatus = "PENDING_APPROVAL"; // Default Safe Mode
    let isPaper = tradingMode === "paper";

    if (isPaper) {
      // Paper Trading: Always execute immediately (simulated)
      initialStatus = "OPEN"; 
    } else {
      // Live Trading logic
      if (executionMode === "auto") {
        initialStatus = "OPEN"; 
        // TODO: Trigger Angel One API Order Placement Here
        // await placeAngelOneOrder(signalData);
      } else {
        initialStatus = "PENDING_APPROVAL"; // Manual / Safe Mode
      }
    }

    // 3. Create Trade Record
    const trade = await Trade.create({
      user: userId,
      trade_id: signalData.trade_id,
      symbol: signalData.symbol,
      setup_name: signalData.setup_name,
      status: signalData.status || initialStatus, // Allow override if provided, else use logic
      entry: signalData.entry,
      exit: signalData.exit, // Might be null for new signals
      pnl: signalData.pnl || 0,
      confidence_score: signalData.confidence_score,
      lots: signalData.lots,
      ml_adjustment: signalData.ml_adjustment,
      execution_mode: executionMode ? executionMode.toUpperCase() : "MANUAL",
      is_paper: isPaper
    });

    res.status(201).json({
      success: true,
      mode: tradingMode,
      execution: executionMode,
      message: `Signal Received. Status: ${initialStatus}`,
      data: trade,
    });

  } catch (error) {
    console.error("Signal Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate Trade ID received" });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Trade History (with smart filters)
// @route   GET /api/trades
// @access  Private
export const getTrades = async (req, res) => {
  try {
    const { status, mode, limit } = req.query;
    
    // Build Query
    const query = { user: req.user._id };
    
    // Allow comma-separated status (e.g. "WIN,LOSS")
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
      .sort({ "entry.time": -1 }) // FIX: -1 for Newest First
      .limit(Number(limit) || 100);

    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Dashboard Statistics (Win Rate, PnL, Active Trades)
// @route   GET /api/trades/stats
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { mode } = req.query; 
    
    const matchStage = { user: userId };
    if (mode === 'paper') matchStage.is_paper = true;
    if (mode === 'live') matchStage.is_paper = false;

    const stats = await Trade.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          totalPnL: { $sum: "$pnl" },
          wins: {
            $sum: { $cond: [{ $eq: ["$status", "WIN"] }, 1, 0] }
          },
          losses: {
            $sum: { $cond: [{ $eq: ["$status", "LOSS"] }, 1, 0] }
          },
          openTrades: {
            $sum: { $cond: [{ $in: ["$status", ["OPEN", "PENDING_APPROVAL"]] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || { totalTrades: 0, totalPnL: 0, wins: 0, losses: 0, openTrades: 0 };
    
    const closedTrades = result.wins + result.losses;
    const winRate = closedTrades > 0 ? ((result.wins / closedTrades) * 100).toFixed(1) : 0;

    res.json({
      ...result,
      winRate: Number(winRate)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};