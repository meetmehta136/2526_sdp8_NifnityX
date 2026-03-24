import Trade from "../models/Trade.js";
import User from "../models/User.js";
import axios from "axios";
import { getPriceSummary } from "../utils/marketDataService.js";
import { calculateExpiryTime, getTimeRemaining } from "../utils/signalExpiry.js";

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - SLIPPAGE PROTECTION
// ════════════════════════════════════════════════════════════════════════════════

// Maximum allowed slippage percentage (0.5%)
const MAX_SLIPPAGE_PERCENT = parseFloat(process.env.MAX_SLIPPAGE_PERCENT) || 0.5;

// Signal expiry time in seconds (default 60 seconds)
const SIGNAL_EXPIRY_SECONDS = parseInt(process.env.SIGNAL_EXPIRY_SECONDS) || 60;

// ── HELPER: Send Webhook to Python ──
const sendExecutionCommand = async (trade) => {
  const pythonUrl = process.env.PYTHON_EXECUTION_URL || "http://localhost:8000";

  // Extract base URL and construct /execute endpoint
  let pythonBase;
  try {
    pythonBase = new URL(pythonUrl).origin;
  } catch {
    pythonBase = "http://localhost:8000";
  }

  try {
    const payload = {
      trade_id: trade.trade_id,
    };

    console.log(`🚀 [Command] Sending EXECUTE to Python: ${pythonBase}/execute`, payload);
    await axios.post(`${pythonBase}/execute`, payload, { timeout: 5000 });
    console.log(`✅ [Command] Python acknowledged - trade executing in paper engine`);
  } catch (pyErr) {
    console.warn(`⚠️ Python webhook failed (trade still recorded): ${pyErr.message}`);
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// A. RECEIVE SIGNAL — POST /api/trade/signal
//    Receives JSON from Python ML Engine.
//    If AUTO mode: Checks slippage -> Executes.
//    If MANUAL mode: Saves as PENDING.
// ════════════════════════════════════════════════════════════════════════════════
export const receiveSignal = async (req, res) => {
  try {
    const signalData = req.body;
    console.log(`\n📩 [Signal] Received: ${signalData.symbol} (${signalData.trade_id})`);

    // ── Normalise Python → Mongo field names ──────────────────────────
    // Python sends breakdown.ml; Trade model expects breakdown.ml_model
    if (signalData.confidence_score?.breakdown?.ml !== undefined) {
      signalData.confidence_score.breakdown.ml_model = signalData.confidence_score.breakdown.ml;
      delete signalData.confidence_score.breakdown.ml;
    }
    // Python sends "strategy"; Trade model expects "strategy_name"
    if (signalData.strategy && !signalData.strategy_name) {
      signalData.strategy_name = signalData.strategy;
    }

    // 1. Validation
    if (!signalData.trade_id || !signalData.symbol || !signalData.entry) {
      return res.status(400).json({ message: "Invalid signal data — missing trade_id, symbol, or entry" });
    }

    // 2. Duplicate check
    const exists = await Trade.findOne({ trade_id: signalData.trade_id });
    if (exists) {
      return res.status(200).json({ message: "Duplicate signal — already logged" });
    }

    // 3. Extract Execution Mode from Python Payload
    const { execution_mode } = req.body;
    const isAuto = execution_mode === "auto";

    // We still need a user reference for the DB (Admin or latest user)
    const adminUser = await User.findOne({ "settings.executionMode": "auto" }) || await User.findOne().sort({ _id: -1 });
    const tradingMode = adminUser?.settings?.tradingMode || "paper";

    // 4. AUTO-PILOT LOGIC
    if (isAuto) {
      console.log(`🤖 [Auto-Pilot] Processing ${signalData.trade_id}...`);

      // A. Slippage Check - ONLY for LIVE mode, SKIP for simulation/paper
      let slippage = 0;
      const entryPrice = signalData.entry.price;
      let livePrice = entryPrice;

      if (tradingMode === "live") {
        try {
          const summary = await getPriceSummary(signalData.symbol);
          if (summary && summary.price) {
            livePrice = summary.price;
            slippage = (Math.abs(livePrice - entryPrice) / entryPrice) * 100;
          }
        } catch (err) {
          console.warn("⚠️ Slippage check failed (live price unavailable), assuming 0");
        }

        const maxSlippage = signalData.constraints?.slippage_per || 0.5;

        if (slippage > maxSlippage) {
          // REJECT due to Slippage - WITH EXPLICIT LOGGING
          console.log("❌ SLIPPAGE REJECT: signal=" + entryPrice + " current=" + livePrice + " slippage=" + slippage.toFixed(2) + "%");
          const rejectedTrade = new Trade({
            ...signalData,
            user: adminUser ? adminUser._id : null,
            status: "REJECTED",
            slippage_pct: slippage,
            rejection_reason: "Auto-skipped: High Slippage (signal: " + entryPrice + ", current: " + livePrice + ", slippage: " + slippage.toFixed(2) + "%)",
            logs: [{ message: "❌ SLIPPAGE REJECT: signal=" + entryPrice + " current=" + livePrice + " slippage=" + slippage.toFixed(2) + "%", time: new Date() }],
          });
          await rejectedTrade.save();
          req.io.emit("new_signal", rejectedTrade);
          console.log("🛑 [Auto-Pilot] Skipped due to slippage: " + slippage.toFixed(2) + "%");
          return res.status(200).json({ success: true, message: "Auto-skipped (High Slippage)", status: "REJECTED" });
        }
      } else {
        // Simulation/Paper mode: skip slippage check (no live price feed)
        console.log("ℹ️ [Simulation] Slippage check skipped (paper mode)");
      }

      // B. EXECUTE
      const openTrade = new Trade({
        ...signalData,
        user: adminUser ? adminUser._id : null,
        status: "OPEN",
        execution_mode: tradingMode.toUpperCase(),
        slippage_pct: slippage,
        logs: [{ message: "Auto-Executed (Slippage: " + slippage.toFixed(2) + "%)", time: new Date() }],
      });

      await openTrade.save();

      // Fire Webhook to Python to execute in paper engine
      sendExecutionCommand(openTrade);

      console.log("⚡ [Auto-Pilot] Executed " + signalData.trade_id + " in " + tradingMode + " mode");
      req.io.emit("new_signal", openTrade); // UI adds as OPEN card directly
      req.io.emit("stats_update", { mode: tradingMode }); // Trigger KPI refresh

      return res.status(200).json({ success: true, message: "Auto-Executed", trade_id: signalData.trade_id, status: "OPEN" });
    }

    // 5. MANUAL MODE (Default) - Add signal metadata for slippage tracking
    const signalTime = signalData.signal_time ? new Date(signalData.signal_time) : new Date();
    const signalPrice = signalData.signal_price || signalData.entry?.price;
    const layer1Score = signalData.layer1_score || signalData.confidence_score?.breakdown?.technical || 0;
    const layer2Score = signalData.layer2_score || signalData.confidence_score?.breakdown?.sentiment || 0;
    const layer3Score = signalData.layer3_score || signalData.confidence_score?.breakdown?.ml_model || 0;
    const thresholdUsed = signalData.threshold_used || 60;
    const signalExpiresAt = new Date(Date.now() + (SIGNAL_EXPIRY_SECONDS * 1000));

    const newTrade = new Trade({
      ...signalData,
      user: adminUser ? adminUser._id : null,
      status: "PENDING_APPROVAL",
      execution_mode: tradingMode.toUpperCase(),
      // New fields for slippage protection
      signal_time: signalTime,
      signal_price: signalPrice,
      layer1_score: layer1Score,
      layer2_score: layer2Score,
      layer3_score: layer3Score,
      threshold_used: thresholdUsed,
      signal_expires_at: signalExpiresAt,
      auto_mode: false,
      logs: [{ message: "Signal received (Manual Mode) - Expires in " + SIGNAL_EXPIRY_SECONDS + "s", time: new Date() }],
    });

    await newTrade.save();
    console.log("💾 [DB] Trade " + signalData.trade_id + " saved as PENDING_APPROVAL");
    console.log("   ⏱️  Signal expires at: " + signalExpiresAt.toISOString());

    // Real-time broadcast
    req.io.emit("new_signal", newTrade);

    res.status(200).json({ success: true, message: "Signal processed", trade_id: signalData.trade_id, expires_in: SIGNAL_EXPIRY_SECONDS });

  } catch (error) {
    console.error("❌ Signal Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// B. APPROVE TRADE — POST /api/trade/:id/approve
//    Slippage check → Send GO command to Python → Update DB.
//    Accepts { force: true } to bypass slippage check.
// ════════════════════════════════════════════════════════════════════════════════
export const approveTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.body;

    const trade = await Trade.findById(id);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    // State machine check
    if (trade.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: "Trade is already " + trade.status });
    }

    // ── SLIPPAGE CHECK ──
    // Get trading mode from user settings
    const user = await User.findById(req.user._id).select("settings");
    const tradingMode = user?.settings?.tradingMode || "paper";

    if (!force && tradingMode === "live") {
      try {
        const summary = await getPriceSummary(trade.symbol);
        if (summary && summary.price) {
          const livePrice = summary.price;
          const signalPrice = trade.signal_price || trade.entry.price;
          const slippage = (Math.abs(livePrice - signalPrice) / signalPrice) * 100;
          const maxSlippage = trade.constraints?.slippage_per || MAX_SLIPPAGE_PERCENT;

          console.log("📊 [Slippage] " + trade.symbol + ": Signal=" + signalPrice + ", Live=" + livePrice + ", Slippage=" + slippage.toFixed(2) + "%, Max=" + maxSlippage + "%");

          // FIXED: Auto-reject when slippage exceeds limit - WITH EXPLICIT LOGGING
          if (slippage > maxSlippage) {
            console.log("❌ SLIPPAGE REJECT: signal=" + signalPrice + " current=" + livePrice + " slippage=" + slippage.toFixed(2) + "%");
            trade.status = "REJECTED";
            trade.rejection_reason = "Slippage limit exceeded (signal: " + signalPrice + ", current: " + livePrice + ", slippage: " + slippage.toFixed(2) + "%)";
            trade.slippage_pct = slippage;
            trade.execution_price = livePrice;
            trade.logs.push({ message: "❌ SLIPPAGE REJECT: signal=" + signalPrice + " current=" + livePrice + " slippage=" + slippage.toFixed(2) + "%", time: new Date() });
            await trade.save();
            req.io.emit("trade_update", trade);
            return res.status(400).json({
              message: "Trade rejected due to slippage limit",
              status: "REJECTED",
              slippage: slippage.toFixed(2),
              maxSlippage,
              signalPrice,
              livePrice,
              hint: "Send { force: true } to override (not recommended)",
            });
          }
        }
      } catch (slippageErr) {
        // If price fetch fails (e.g. simulation mode, market closed), skip check
        console.warn("⚠️ Slippage check skipped (price unavailable):", slippageErr.message);
      }
    } else if (tradingMode !== "live") {
      // Simulation/Paper mode: skip slippage check
      console.log("ℹ️ [Approve] Slippage check skipped (paper/simulation mode)");
    } else {
      console.log("⚡ [Force] Slippage check bypassed for " + trade.trade_id);
    }

    // ── DETERMINE EXECUTION MODE ──
    trade.execution_mode = tradingMode.toUpperCase();

    // ── SEND "GO" COMMAND TO PYTHON ──
    await sendExecutionCommand(trade);

    // ── UPDATE TRADE ──
    trade.status = "OPEN";
    trade.entry_time = new Date();
    trade.logs.push({ message: "Approved by user (mode: " + trade.execution_mode + ")", time: new Date() });
    await trade.save();

    console.log("📝 [Approved] Trade " + trade.trade_id + " → OPEN (" + trade.execution_mode + ")");

    // ── BROADCAST ──
    req.io.emit("trade_update", trade);
    req.io.emit("stats_update", { mode: tradingMode });

    res.status(200).json(trade);

  } catch (error) {
    console.error("❌ Approve Error:", error.message);
    res.status(500).json({ message: "Failed to approve trade" });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// B1.5. EXIT / SELL TRADE — POST /api/trade/:id/exit
//       User manually exits an OPEN position from the UI.
//       Sends EXIT command to Python agent to sell.
// ════════════════════════════════════════════════════════════════════════════════
export const exitTrade = async (req, res) => {
  try {
    const { id } = req.params;

    const trade = await Trade.findById(id);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    if (trade.status !== "OPEN") {
      return res.status(400).json({ message: "Cannot exit — trade is " + trade.status });
    }

    const pythonUrl = process.env.PYTHON_EXECUTION_URL || "http://localhost:8000";
    const pythonBase = (() => { try { return new URL(pythonUrl).origin; } catch { return "http://localhost:8000"; } })();

    // ── CALL PYTHON /exit AND READ RESPONSE DIRECTLY ──
    // Python returns full P&L data in its response body.
    // We update the DB here — no need to wait for Python's /update callback.
    // This eliminates the x-python-secret race condition entirely.
    let pyData = null;
    try {
      const payload = { trade_id: trade.trade_id };
      console.log("🔴 [Exit] Sending EXIT to Python:", pythonBase + "/exit", payload);
      const pyRes = await axios.post(pythonBase + "/exit", payload, { timeout: 8000 });
      pyData = pyRes.data;
      console.log("✅ [Exit] Python response:", JSON.stringify(pyData));
    } catch (pyErr) {
      console.warn("⚠️ Python exit failed: " + pyErr.message);
      return res.status(502).json({ message: "Python engine unreachable — cannot close position safely" });
    }

    // ── UPDATE DB DIRECTLY FROM PYTHON RESPONSE ──
    // Python /exit returns: { status:"closed", pnl, gross_pnl, total_costs, won, exit_price, exit_time, exit_reason }
    if (pyData && (pyData.status === "closed" || pyData.status === "already_closed")) {
      const won = Boolean(pyData.won);
      const net_pnl = Number(pyData.pnl ?? 0);
      const gross_pnl = Number(pyData.gross_pnl ?? net_pnl);
      const costs = Number(pyData.total_costs ?? 0);
      const exitPrice = Number(pyData.exit_price ?? trade.entry?.price ?? 0);
      const exitTime = new Date(pyData.exit_time ?? Date.now());

      trade.status = won ? "WIN" : "LOSS";
      trade.pnl = net_pnl;
      trade.gross_pnl = gross_pnl;
      trade.total_costs = costs;
      trade.exit = { price: exitPrice, time: exitTime, reason: "MANUAL_EXIT" };
      trade.exit_time = exitTime;
      trade.logs.push({
        message: `Manual exit: ${won ? "WIN" : "LOSS"} ₹${net_pnl >= 0 ? "+" : ""}${net_pnl.toFixed(2)}`,
        time: new Date(),
      });
      await trade.save();

      console.log(`📝 [Exit] ${trade.trade_id} → ${trade.status} | P&L: ₹${net_pnl}`);
      req.io.emit("trade_update", trade);
      req.io.emit("stats_update", { mode: trade.execution_mode?.toLowerCase() });

      return res.status(200).json({ success: true, trade });
    }

    // Fallback: Python responded but format was unexpected — log and wait for callback
    console.warn("⚠️ [Exit] Unexpected Python response format, falling back to callback:", pyData);
    trade.logs.push({ message: "Manual exit requested — awaiting engine callback", time: new Date() });
    await trade.save();
    res.status(200).json({ success: true, message: "Exit command sent — awaiting Python callback" });

  } catch (error) {
    console.error("❌ Exit Error:", error.message);
    res.status(500).json({ message: "Failed to exit trade" });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// B2. REJECT TRADE — POST /api/trade/:id/reject
// ════════════════════════════════════════════════════════════════════════════════
export const rejectTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const trade = await Trade.findById(id);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    if (trade.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: "Trade is already " + trade.status });
    }

    trade.status = "REJECTED";
    if (reason) trade.exit = { ...trade.exit?.toObject?.() || {}, reason };
    trade.logs.push({ message: "Rejected: " + (reason || "User decision"), time: new Date() });
    await trade.save();

    console.log("📝 [Rejected] Trade " + trade.trade_id);
    req.io.emit("trade_update", trade);

    res.status(200).json(trade);

  } catch (error) {
    console.error("❌ Reject Error:", error.message);
    res.status(500).json({ message: "Failed to reject trade" });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// C. UPDATE TRADE STATUS — POST /api/trade/update
//    Receives "Sold" / "Order Filled" from Python.
//    Protected via x-python-secret header.
// ════════════════════════════════════════════════════════════════════════════════
export const updateTradeStatus = async (req, res) => {
  try {
    // ── SECURITY: Header check ──
    const secret = req.headers["x-python-secret"];
    const expectedSecret = process.env.PYTHON_SECRET || "nifnityx-python-key";

    if (secret !== expectedSecret) {
      return res.status(403).json({ message: "Forbidden — invalid x-python-secret header" });
    }

    const { trade_id, status, exit, pnl, pnl_percentage, broker_order_id, gross_pnl, total_costs, cost_breakdown, strategy_name } = req.body;

    if (!trade_id || !status) {
      return res.status(400).json({ message: "trade_id and status are required" });
    }

    const trade = await Trade.findOne({ trade_id });
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    // Update fields
    trade.status = status;
    if (exit) trade.exit = exit;
    if (pnl !== undefined) trade.pnl = pnl;
    if (pnl_percentage !== undefined) trade.pnl_percentage = pnl_percentage;
    if (broker_order_id) trade.broker_order_id = broker_order_id;

    // --- NEW: Friction / Cost Data ---
    if (gross_pnl !== undefined) trade.gross_pnl = gross_pnl;
    if (total_costs !== undefined) trade.total_costs = total_costs;
    if (cost_breakdown) trade.cost_breakdown = cost_breakdown;

    // --- Strategy Mapping ---
    if (strategy_name) {
      trade.strategy_name = strategy_name;
    } else if (!trade.strategy_name) {
      trade.strategy_name = "sniper";
    }

    // Exit time tracking
    if (exit && exit.time) {
      trade.exit_time = new Date(exit.time);
    }

    trade.logs.push({
      message: "Trade closed: " + (exit?.reason || status) + " (P&L: " + (pnl || 0) + ")",
      time: new Date(),
    });

    await trade.save();

    console.log("📝 [Update] Trade " + trade_id + " → " + status + " (P&L: " + pnl + ")");

    // Broadcast to dashboard
    req.io.emit("trade_update", trade);

    res.status(200).json({ success: true, trade });

  } catch (error) {
    console.error("❌ Update Error:", error.message);
    res.status(500).json({ message: "Failed to update trade" });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// D. GET TRADES — GET /api/trade/
// ════════════════════════════════════════════════════════════════════════════════
export const getTrades = async (req, res) => {
  try {
    const { status, mode, limit } = req.query;
    const query = {};

    if (status) {
      // "closed" is an alias for WIN + LOSS (Trade History page compatibility)
      if (status.toLowerCase() === "closed") {
        query.status = { $in: ["WIN", "LOSS"] };
      } else if (status.toLowerCase() === "open") {
        query.status = { $in: ["OPEN", "PENDING_APPROVAL"] };
      } else if (status.includes(",")) {
        query.status = { $in: status.split(",").map(s => s.trim().toUpperCase()) };
      } else {
        query.status = status.toUpperCase();
      }
    }

    if (mode === "paper") query.execution_mode = "PAPER";
    if (mode === "live") query.execution_mode = "LIVE";

    const trades = await Trade.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 100);

    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// D1. GET TRADE BY ID — GET /api/trade/:id
//    For Python bot to poll trade status during demo pause
// ════════════════════════════════════════════════════════════════════════════════
export const getTradeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try by trade_id first (Python always uses trade_id like SIM-xxx)
    let trade = await Trade.findOne({ trade_id: id });

    // Fallback to MongoDB _id (frontend uses _id)
    if (!trade) {
      try {
        trade = await Trade.findById(id);
      } catch (_) {
        // id is not a valid ObjectId — that's fine
      }
    }

    if (!trade) {
      return res.status(404).json({ message: "Trade not found" });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// E. DASHBOARD STATS — GET /api/trade/stats
// ════════════════════════════════════════════════════════════════════════════════
export const getDashboardStats = async (req, res) => {
  try {
    const { mode } = req.query;
    const matchStage = {};
    if (mode === "paper") matchStage.execution_mode = "PAPER";
    if (mode === "live") matchStage.execution_mode = "LIVE";

    const stats = await Trade.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          totalPnL: { $sum: { $ifNull: ["$pnl", 0] } },
          wins: { $sum: { $cond: [{ $eq: ["$status", "WIN"] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $eq: ["$status", "LOSS"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
          openTrades: { $sum: { $cond: [{ $eq: ["$status", "OPEN"] }, 1, 0] } },
        },
      },
    ]);

    const result = stats[0] || { totalTrades: 0, totalPnL: 0, wins: 0, losses: 0, rejected: 0, openTrades: 0 };
    const closedTrades = result.wins + result.losses;
    const winRate = closedTrades > 0 ? ((result.wins / closedTrades) * 100).toFixed(1) : 0;

    res.json({ ...result, winRate: Number(winRate) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// F. ACCOUNT SUMMARY — GET /api/trade/account-summary
// ════════════════════════════════════════════════════════════════════════════════
export const getAccountSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const initialCapital = user.settings?.initial_capital || 100000;

    // Fetch all closed trades (system-wide for single-admin) sorted by date
    const trades = await Trade.find({
      status: { $in: ["WIN", "LOSS"] }
    }).sort({ createdAt: 1 });

    let runningCapital = initialCapital;
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;

    // Build Equity Curve
    const equityCurve = trades.map(trade => {
      const pnl = trade.pnl || 0;
      totalPnL += pnl;
      runningCapital += pnl;

      if (trade.status === "WIN") wins++;
      if (trade.status === "LOSS") losses++;

      // Create a simplified date string for the chart (Use simulated exit time instead of MongoDB insertion time)
      const exitTime = trade.exit?.time || trade.entry?.time || trade.createdAt;
      const date = new Date(exitTime).toLocaleDateString('en-CA'); // YYYY-MM-DD

      return { date, value: runningCapital };
    });

    // Add User Start Date as baseline
    equityCurve.unshift({
      date: new Date(user.createdAt).toLocaleDateString('en-CA'),
      value: initialCapital
    });

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;

    res.json({
      metrics: {
        total_pnl: totalPnL,
        win_rate: Number(winRate),
        total_trades: totalTrades,
        current_capital: runningCapital,
        initial_capital: initialCapital
      },
      charts: {
        equity_curve: equityCurve,
        win_loss_distribution: [
          { status: "Win", count: wins, fill: "var(--color-win)" },
          { status: "Loss", count: losses, fill: "var(--color-loss)" }
        ]
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// G. ANALYTICS — GET /api/trade/analytics
// ════════════════════════════════════════════════════════════════════════════════
export const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, mode, strategy } = req.query;
    const userId = req.user._id;

    // Build Match Stage
    const matchQuery = {
      status: { $in: ["WIN", "LOSS"] },
    };

    if (mode === "LIVE") matchQuery.execution_mode = "LIVE";
    if (mode === "PAPER") matchQuery.execution_mode = "PAPER";
    if (strategy) matchQuery.strategy_name = strategy;

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // Fetch User for Initial Capital
    const user = await User.findById(userId);
    const initialCapital = user.settings?.initial_capital || 100000;

    // Fetch Trades
    const trades = await Trade.find(matchQuery).sort({ createdAt: 1 });

    // ── Accumulators ──
    let totalPnL = 0, wins = 0, losses = 0;
    let totalWinVal = 0, totalLossVal = 0;
    let totalGrossPnl = 0, totalCosts = 0;
    let brokerageSum = 0, govTaxSum = 0;
    let currentCapital = initialCapital;

    const equityCurve = [];
    const dailyPnL = {};
    const mlScatterData = [];
    const timeOfDayPnL = {}; 
    const drawdownCurve = [];
    
    // Streaks & Sequence tracking
    let currentWinStreak = 0, maxWinStreak = 0;
    let currentLossStreak = 0, maxLossStreak = 0;
    let peakCapital = initialCapital;
    let maxDrawdown = 0;

    trades.forEach(trade => {
      const pnl = trade.pnl || 0;
      totalPnL += pnl;
      currentCapital += pnl;

      // Win/Loss Streaks
      if (trade.status === "WIN") {
        wins++;
        totalWinVal += pnl;
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if (trade.status === "LOSS") {
        losses++;
        totalLossVal += Math.abs(pnl);
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }

      // Drawdown calculation
      if (currentCapital > peakCapital) peakCapital = currentCapital;
      const dd = currentCapital - peakCapital;
      if (dd < maxDrawdown) maxDrawdown = dd;
      
      const exitTime = trade.exit?.time || trade.entry?.time || trade.createdAt;
      const dateStr = new Date(exitTime).toLocaleDateString('en-CA');
      
      equityCurve.push({ date: dateStr, cumulative_pnl: totalPnL, capital: currentCapital });
      drawdownCurve.push({ date: dateStr, drawdown: dd });

      dailyPnL[dateStr] = (dailyPnL[dateStr] || 0) + pnl;
      totalGrossPnl += (trade.gross_pnl || 0);
      totalCosts += (trade.total_costs || 0);
      const cb = trade.cost_breakdown || {};
      brokerageSum += (cb.brokerage || 0);
      govTaxSum += (cb.stt || 0) + (cb.gst || 0) + (cb.stamp_duty || 0) + (cb.exchange_txn || 0) + (cb.sebi || 0);

      const mlScore = trade.confidence_score?.breakdown?.ml_model || 0;
      if (mlScore > 0) {
        mlScatterData.push({ ml_score: mlScore, pnl: pnl, status: trade.status });
      }

      const entryTime = trade.entry?.time || trade.createdAt;
      if (entryTime) {
        let hour = new Date(entryTime).getHours();
        const hourLabel = hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
        timeOfDayPnL[hourLabel] = (timeOfDayPnL[hourLabel] || 0) + pnl;
      }
    });

    // ── ADVANCED RISK CALCULATIONS ──
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
    const profitFactor = totalLossVal > 0 ? (totalWinVal / totalLossVal).toFixed(2) : (totalWinVal > 0 ? 100 : 0);
    
    // Average Win vs Average Loss
    const avgWin = wins > 0 ? totalWinVal / wins : 0;
    const avgLoss = losses > 0 ? totalLossVal / losses : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 0;

    // Sharpe Ratio (Simplified Annualized)
    // Assume 252 trading days. We calculate daily returns first.
    const dailyPnLValues = Object.values(dailyPnL);
    let sharpeRatio = 0;
    let sortinoRatio = 0;
    
    if (dailyPnLValues.length > 2) {
      const mean = dailyPnLValues.reduce((a, b) => a + b, 0) / dailyPnLValues.length;
      const variance = dailyPnLValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyPnLValues.length;
      const stdDev = Math.sqrt(variance);
      
      // Sharpe = Mean / StdDev * sqrt(252)
      if (stdDev > 0) {
        sharpeRatio = (mean / stdDev) * Math.sqrt(252);
      }
      
      // Sortino = Mean / DownsideDev * sqrt(252)
      const negativeReturns = dailyPnLValues.filter(v => v < 0);
      if (negativeReturns.length > 0) {
        const downsideVariance = negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / dailyPnLValues.length;
        const downsideDev = Math.sqrt(downsideVariance);
        if (downsideDev > 0) {
          sortinoRatio = (mean / downsideDev) * Math.sqrt(252);
        }
      }
    }

    const dailyPnLArray = Object.keys(dailyPnL).map(date => ({
      date, pnl: Number(dailyPnL[date].toFixed(2))
    })).sort((a, b) => a.date.localeCompare(b.date));

    const netProfit = Math.max(totalPnL, 0);
    const frictionDonut = [
      { name: "Net Profit", value: Number(netProfit.toFixed(2)), fill: "hsl(142, 76%, 36%)" },
      { name: "Brokerage", value: Number(brokerageSum.toFixed(2)), fill: "hsl(38, 92%, 50%)" },
      { name: "Govt Taxes", value: Number(govTaxSum.toFixed(2)), fill: "hsl(0, 84%, 60%)" },
    ];

    const timeOfDayArray = [];
    for (let i = 9; i <= 15; i++) {
      const hLabel = i > 12 ? `${i - 12} PM` : `${i} AM`;
      timeOfDayArray.push({
        hour: hLabel,
        pnl: timeOfDayPnL[hLabel] ? Number(timeOfDayPnL[hLabel].toFixed(2)) : 0
      });
    }

    res.json({
      kpis: {
        total_pnl: totalPnL,
        win_rate: Number(winRate),
        profit_factor: Number(profitFactor),
        total_trades: totalTrades,
        total_gross_pnl: totalGrossPnl,
        total_costs: totalCosts,
        // Advanced
        sharpe_ratio: Number(sharpeRatio.toFixed(2)),
        sortino_ratio: Number(sortinoRatio.toFixed(2)),
        max_drawdown: Number(maxDrawdown.toFixed(2)),
        max_drawdown_per: Number(((maxDrawdown / initialCapital) * 100).toFixed(2)),
        avg_win: Number(avgWin.toFixed(2)),
        avg_loss: Number(avgLoss.toFixed(2)),
        risk_reward: Number(riskRewardRatio),
        max_win_streak: maxWinStreak,
        max_loss_streak: maxLossStreak,
      },
      equity_curve: equityCurve,
      drawdown_curve: drawdownCurve,
      daily_pnl: dailyPnLArray,
      friction_donut: frictionDonut,
      ml_scatter: mlScatterData,
      time_of_day_pnl: timeOfDayArray,
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
};