import Trade from "../models/Trade.js";
import User from "../models/User.js";
import axios from "axios";
import { getPriceSummary } from "../utils/marketDataService.js";

// ── HELPER: Send Webhook to Python ──
const sendExecutionCommand = async (trade) => {
  const pythonUrl = process.env.PYTHON_EXECUTION_URL;
  if (!pythonUrl) {
    console.warn("⚠️ PYTHON_EXECUTION_URL not set — skipping webhook");
    return;
  }

  try {
    const payload = {
      trade_id: trade.trade_id,
      action: "EXECUTE",
      mode: trade.execution_mode,
      symbol: trade.symbol,
      quantity: trade.lots || 1,
      stop_loss: trade.entry.stop_loss || 0,
      entry_price: trade.entry.price,
      setup_name: trade.setup_name,
    };

    console.log(`🚀 [Command] Sending GO to Python: ${pythonUrl}`, payload);
    await axios.post(pythonUrl, payload, { timeout: 5000 });
    console.log(`✅ [Command] Python acknowledged`);
  } catch (pyErr) {
    console.warn(`⚠️ Python webhook failed (trade still recorded): ${pyErr.message}`);
  }
};

// ═══════════════════════════════════════════════════════════
// A. RECEIVE SIGNAL — POST /api/trade/signal
//    Receives JSON from Python ML Engine.
//    If AUTO mode: Checks slippage -> Executes.
//    If MANUAL mode: Saves as PENDING.
// ═══════════════════════════════════════════════════════════
export const receiveSignal = async (req, res) => {
  try {
    const signalData = req.body;
    console.log(`\n📩 [Signal] Received: ${signalData.symbol} (${signalData.trade_id})`);

    // 1. Validation
    if (!signalData.trade_id || !signalData.symbol || !signalData.entry) {
      return res.status(400).json({ message: "Invalid signal data — missing trade_id, symbol, or entry" });
    }

    // 2. Duplicate check
    const exists = await Trade.findOne({ trade_id: signalData.trade_id });
    if (exists) {
      return res.status(200).json({ message: "Duplicate signal — already logged" });
    }

    // 3. Get Admin User Settings (Single User / Admin Mode)
    const adminUser = await User.findOne({ role: "admin" });
    const executionMode = adminUser?.settings?.executionMode || "manual";
    const tradingMode = adminUser?.settings?.tradingMode || "paper";

    // 4. AUTO-PILOT LOGIC
    if (executionMode === "auto") {
      console.log(`🤖 [Auto-Pilot] Processing ${signalData.trade_id}...`);

      // A. Slippage Check
      let slippage = 0;
      let livePrice = 0;
      try {
        const summary = await getPriceSummary(signalData.symbol);
        if (summary && summary.price) {
          livePrice = summary.price;
          const entryPrice = signalData.entry.price;
          slippage = (Math.abs(livePrice - entryPrice) / entryPrice) * 100;
        }
      } catch (err) {
        console.warn("⚠️ Slippage check failed, assuming 0");
      }

      const maxSlippage = signalData.constraints?.slippage_per || 0.5;

      if (slippage > maxSlippage) {
        // REJECT due to Slippage
        const rejectedTrade = new Trade({
          ...signalData,
          user: adminUser ? adminUser._id : null,
          status: "REJECTED",
          logs: [{ message: `Auto-skipped: High Slippage (${slippage.toFixed(2)}% > ${maxSlippage}%)`, time: new Date() }],
        });
        await rejectedTrade.save();
        req.io.emit("new_signal", rejectedTrade); // UI shows rejected card
        console.log(`🛑 [Auto-Pilot] Skipped due to slippage: ${slippage.toFixed(2)}%`);
        return res.status(200).json({ success: true, message: "Auto-skipped (High Slippage)", status: "REJECTED" });
      }

      // B. EXECUTE
      const openTrade = new Trade({
        ...signalData,
        user: adminUser ? adminUser._id : null,
        status: "OPEN",
        execution_mode: tradingMode.toUpperCase(),
        logs: [{ message: `Auto-Executed (Slippage: ${slippage.toFixed(2)}%)`, time: new Date() }],
      });

      await openTrade.save();

      // Fire Webhook
      sendExecutionCommand(openTrade);

      console.log(`⚡ [Auto-Pilot] Executed ${signalData.trade_id} in ${tradingMode} mode`);
      req.io.emit("new_signal", openTrade); // UI adds as OPEN card directly

      return res.status(200).json({ success: true, message: "Auto-Executed", trade_id: signalData.trade_id, status: "OPEN" });
    }

    // 5. MANUAL MODE (Default)
    const newTrade = new Trade({
      ...signalData,
      user: adminUser ? adminUser._id : null,
      status: "PENDING_APPROVAL",
      logs: [{ message: "Signal received (Manual Mode)", time: new Date() }],
    });

    await newTrade.save();
    console.log(`💾 [DB] Trade ${signalData.trade_id} saved as PENDING_APPROVAL`);

    // Real-time broadcast
    req.io.emit("new_signal", newTrade);

    res.status(200).json({ success: true, message: "Signal processed", trade_id: signalData.trade_id });

  } catch (error) {
    console.error("❌ Signal Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ═══════════════════════════════════════════════════════════
// B. APPROVE TRADE — POST /api/trade/:id/approve
//    Slippage check → Send GO command to Python → Update DB.
//    Accepts { force: true } to bypass slippage check.
// ═══════════════════════════════════════════════════════════
export const approveTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.body;

    const trade = await Trade.findById(id);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    // State machine check
    if (trade.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: `Trade is already ${trade.status}` });
    }

    // ── SLIPPAGE CHECK ──
    if (!force) {
      try {
        const summary = await getPriceSummary(trade.symbol);
        if (summary && summary.price) {
          const livePrice = summary.price;
          const entryPrice = trade.entry.price;
          const slippage = (Math.abs(livePrice - entryPrice) / entryPrice) * 100;
          const maxSlippage = trade.constraints?.slippage_per || 0.5;

          console.log(`📊 [Slippage] ${trade.symbol}: Entry=${entryPrice}, Live=${livePrice}, Slippage=${slippage.toFixed(2)}%, Max=${maxSlippage}%`);

          if (slippage > maxSlippage) {
            return res.status(400).json({
              message: "Price slipped too much",
              slippage: slippage.toFixed(2),
              maxSlippage,
              livePrice,
              entryPrice,
              hint: "Send { force: true } to override",
            });
          }
        }
      } catch (slippageErr) {
        console.warn("⚠️ Slippage check failed (proceeding anyway):", slippageErr.message);
      }
    } else {
      console.log(`⚡ [Force] Slippage check bypassed for ${trade.trade_id}`);
    }

    // ── DETERMINE EXECUTION MODE ──
    const user = await User.findById(req.user._id).select("settings");
    const tradingMode = user?.settings?.tradingMode || "paper";
    trade.execution_mode = tradingMode.toUpperCase();

    // ── SEND "GO" COMMAND TO PYTHON ──
    await sendExecutionCommand(trade);

    // ── UPDATE TRADE ──
    trade.status = "OPEN";
    trade.logs.push({ message: `Approved by user (mode: ${trade.execution_mode})`, time: new Date() });
    await trade.save();

    console.log(`📝 [Approved] Trade ${trade.trade_id} → OPEN (${trade.execution_mode})`);

    // ── BROADCAST ──
    req.io.emit("trade_update", trade);

    res.status(200).json(trade);

  } catch (error) {
    console.error("❌ Approve Error:", error.message);
    res.status(500).json({ message: "Failed to approve trade" });
  }
};

// ═══════════════════════════════════════════════════════════
// B1.5. EXIT / SELL TRADE — POST /api/trade/:id/exit
//       User manually exits an OPEN position from the UI.
//       Sends EXIT command to Python agent to sell.
// ═══════════════════════════════════════════════════════════
export const exitTrade = async (req, res) => {
  try {
    const { id } = req.params;

    const trade = await Trade.findById(id);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    if (trade.status !== "OPEN") {
      return res.status(400).json({ message: `Cannot exit — trade is ${trade.status}` });
    }

    // ── SEND EXIT COMMAND TO PYTHON ──
    const pythonUrl = process.env.PYTHON_EXECUTION_URL;

    if (pythonUrl) {
      try {
        const payload = {
          trade_id: trade.trade_id,
          action: "EXIT",
          symbol: trade.symbol,
          quantity: trade.lots || 1,
          mode: trade.execution_mode,
          entry_price: trade.entry.price,
        };

        console.log(`🔴 [Exit] Sending SELL to Python: ${pythonUrl}`, payload);
        await axios.post(pythonUrl, payload, { timeout: 5000 });
        console.log(`✅ [Exit] Python acknowledged sell command`);
      } catch (pyErr) {
        console.warn(`⚠️ Python sell webhook failed: ${pyErr.message}`);
      }
    }

    trade.logs.push({ message: "Manual exit requested by user", time: new Date() });
    await trade.save();

    console.log(`📝 [Exit] Sell command sent for ${trade.trade_id}`);
    req.io.emit("trade_update", trade);

    res.status(200).json({ success: true, message: "Exit command sent to Python", trade });

  } catch (error) {
    console.error("❌ Exit Error:", error.message);
    res.status(500).json({ message: "Failed to exit trade" });
  }
};

// ═══════════════════════════════════════════════════════════
// B2. REJECT TRADE — POST /api/trade/:id/reject
// ═══════════════════════════════════════════════════════════
export const rejectTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const trade = await Trade.findById(id);
    if (!trade) return res.status(404).json({ message: "Trade not found" });

    if (trade.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: `Trade is already ${trade.status}` });
    }

    trade.status = "REJECTED";
    if (reason) trade.exit = { ...trade.exit?.toObject?.() || {}, reason };
    trade.logs.push({ message: `Rejected: ${reason || "User decision"}`, time: new Date() });
    await trade.save();

    console.log(`📝 [Rejected] Trade ${trade.trade_id}`);
    req.io.emit("trade_update", trade);

    res.status(200).json(trade);

  } catch (error) {
    console.error("❌ Reject Error:", error.message);
    res.status(500).json({ message: "Failed to reject trade" });
  }
};

// ═══════════════════════════════════════════════════════════
// C. UPDATE TRADE STATUS — POST /api/trade/update
//    Receives "Sold" / "Order Filled" from Python.
//    Protected via x-python-secret header.
// ═══════════════════════════════════════════════════════════
export const updateTradeStatus = async (req, res) => {
  try {
    // ── SECURITY: Header check ──
    const secret = req.headers["x-python-secret"];
    const expectedSecret = process.env.PYTHON_SECRET || "nifnityx-python-key";

    if (secret !== expectedSecret) {
      return res.status(403).json({ message: "Forbidden — invalid x-python-secret header" });
    }

    const { trade_id, status, exit, pnl, pnl_percentage, broker_order_id } = req.body;

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

    trade.logs.push({
      message: `Trade closed: ${exit?.reason || status} (P&L: ${pnl || 0})`,
      time: new Date(),
    });

    await trade.save();

    console.log(`📝 [Update] Trade ${trade_id} → ${status} (P&L: ${pnl})`);

    // Broadcast to dashboard
    req.io.emit("trade_update", trade);

    res.status(200).json({ success: true, trade });

  } catch (error) {
    console.error("❌ Update Error:", error.message);
    res.status(500).json({ message: "Failed to update trade" });
  }
};

// ═══════════════════════════════════════════════════════════
// D. GET TRADES — GET /api/trade/
// ═══════════════════════════════════════════════════════════
export const getTrades = async (req, res) => {
  try {
    const { status, mode, limit } = req.query;
    const query = {
      $or: [{ user: req.user._id }, { user: null }],
    };

    if (status) {
      if (status.includes(",")) {
        query.status = { $in: status.split(",") };
      } else {
        query.status = status;
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

// ═══════════════════════════════════════════════════════════
// E. DASHBOARD STATS — GET /api/trade/stats
// ═══════════════════════════════════════════════════════════
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
          rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
        },
      },
    ]);

    const result = stats[0] || { totalTrades: 0, totalPnL: 0, wins: 0, losses: 0, rejected: 0 };
    const closedTrades = result.wins + result.losses;
    const winRate = closedTrades > 0 ? ((result.wins / closedTrades) * 100).toFixed(1) : 0;

    res.json({ ...result, winRate: Number(winRate) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// F. ACCOUNT SUMMARY — GET /api/trade/account-summary
// ═══════════════════════════════════════════════════════════
export const getAccountSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const initialCapital = user.settings?.initial_capital || 100000; // Default

    // Fetch all closed trades sorted by date
    const trades = await Trade.find({
      user: userId,
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

      // Create a simplified date string for the chart
      const date = new Date(trade.createdAt).toLocaleDateString('en-CA'); // YYYY-MM-DD

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

// ═══════════════════════════════════════════════════════════
// G. ANALYTICS — GET /api/trade/analytics
// ═══════════════════════════════════════════════════════════
export const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, mode } = req.query;
    const userId = req.user._id;

    // Build Match Stage
    const matchQuery = {
      $or: [{ user: userId }, { user: null }],
      status: { $in: ["WIN", "LOSS"] }, // Only closed trades
    };

    if (mode === "LIVE") matchQuery.execution_mode = "LIVE";
    if (mode === "PAPER") matchQuery.execution_mode = "PAPER";

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // Fetch User for Initial Capital
    const user = await User.findById(userId);
    const initialCapital = user.settings?.initial_capital || 100000;

    // Fetch Trades for granular calculation
    const trades = await Trade.find(matchQuery).sort({ createdAt: 1 });

    // 1. KPI Calculation
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let totalWinVal = 0;
    let totalLossVal = 0;
    let maxDrawdown = 0;
    let peakCapital = initialCapital;
    let currentCapital = initialCapital;

    // 2. Equity Curve & Heatmap Data Containers
    const equityCurve = [];
    const dailyPnL = {}; // Key: "YYYY-MM-DD"
    const hourlyStats = {}; // Key: "HH:00"

    // 3. Strategy Data Container
    const strategyStats = {};

    trades.forEach(trade => {
      const pnl = trade.pnl || 0;
      totalPnL += pnl;
      currentCapital += pnl;

      // Drawdown calc
      if (currentCapital > peakCapital) peakCapital = currentCapital;
      const drawdown = currentCapital - peakCapital;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;

      // Win/Loss
      if (trade.status === "WIN") {
        wins++;
        totalWinVal += pnl;
      } else if (trade.status === "LOSS") {
        losses++;
        totalLossVal += Math.abs(pnl);
      }

      // Equity Curve Point
      const dateStr = new Date(trade.createdAt).toLocaleDateString('en-CA');
      equityCurve.push({ date: dateStr, balance: currentCapital, pnl });

      // Daily Heatmap Aggregation
      dailyPnL[dateStr] = (dailyPnL[dateStr] || 0) + pnl;

      // Hourly Aggregation
      const hour = new Date(trade.createdAt).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      if (!hourlyStats[hourKey]) hourlyStats[hourKey] = { pnl: 0, wins: 0, total: 0 };
      hourlyStats[hourKey].pnl += pnl;
      hourlyStats[hourKey].total++;
      if (trade.status === "WIN") hourlyStats[hourKey].wins++;

      // Strategy Aggregation
      const setup = trade.setup_name || "Unknown";
      if (!strategyStats[setup]) strategyStats[setup] = { pnl: 0, wins: 0, total: 0, winVal: 0, lossVal: 0 };
      strategyStats[setup].pnl += pnl;
      strategyStats[setup].total++;
      if (trade.status === "WIN") {
        strategyStats[setup].wins++;
        strategyStats[setup].winVal += pnl;
      } else {
        strategyStats[setup].lossVal += Math.abs(pnl);
      }
    });

    // Finalize KPIs
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
    const profitFactor = totalLossVal > 0 ? (totalWinVal / totalLossVal).toFixed(2) : (totalWinVal > 0 ? 100 : 0);
    const avgTradePnL = totalTrades > 0 ? (totalPnL / totalTrades).toFixed(2) : 0;

    // Transform Hourly Data for Chart
    const hourlyHeatmap = Object.keys(hourlyStats).map(hour => ({
      hour,
      pnl: hourlyStats[hour].pnl,
      win_rate: Math.round((hourlyStats[hour].wins / hourlyStats[hour].total) * 100),
      frequency: hourlyStats[hour].total
    })).sort((a, b) => a.hour.localeCompare(b.hour));

    // Transform Strategy Data for Radar
    const strategyRadar = Object.keys(strategyStats).map(name => {
      const s = strategyStats[name];
      const wr = s.total > 0 ? (s.wins / s.total) * 100 : 0;
      const pf = s.lossVal > 0 ? (s.winVal / s.lossVal) : (s.winVal > 0 ? 10 : 0);

      return {
        subject: name,
        winRate: Math.round(wr),
        profitFactor: Number(Number(pf).toFixed(2)),
        totalPnL: s.pnl,
        frequency: s.total,
        // Normalized values (0-100) for Radar Chart scaling
        A: Math.min(wr, 100), // Win Rate
        B: Math.min(pf * 20, 100), // Profit Factor (scaled)
        fullMark: 100
      };
    });

    // Transform Daily PnL for Heatmap Grid
    const heatmapGrid = Object.keys(dailyPnL).map(date => ({
      date,
      pnl: dailyPnL[date],
      level: dailyPnL[date] > 0 ? (dailyPnL[date] > 5000 ? 4 : 2) : (dailyPnL[date] < 0 ? 1 : 0) // Simplified level
    }));

    res.json({
      kpis: {
        total_pnl: totalPnL,
        win_rate: Number(winRate),
        profit_factor: Number(profitFactor),
        total_trades: totalTrades,
        avg_trade_pnl: Number(avgTradePnL),
        max_drawdown: maxDrawdown,
        expectancy: totalTrades > 0 ? (totalPnL / totalTrades).toFixed(0) : 0
      },
      equity_curve: equityCurve, // Now returns full history with balance
      strategy_radar: strategyRadar,
      hourly_heatmap: hourlyHeatmap,
      heatmap: heatmapGrid
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
};
