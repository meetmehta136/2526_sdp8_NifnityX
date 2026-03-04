import Trade from "../models/Trade.js";

/**
 * Signal Expiry Background Worker
 * Automatically expires pending signals after 60 seconds.
 */

const EXPIRY_CHECK_INTERVAL = 10000; // 10 seconds
let workerInterval = null;

export const startSignalExpiryWorker = (io) => {
  if (workerInterval) {
    console.log("⚠️ Signal expiry worker already running");
    return;
  }

  console.log("🔄 Starting signal expiry worker (checks every 10s)");

  workerInterval = setInterval(async () => {
    try {
      const now = new Date();
      
      const expiredSignals = await Trade.find({
        status: "PENDING_APPROVAL",
        signal_expires_at: { $lte: now }
      });

      if (expiredSignals.length > 0) {
        console.log(`⏰ Found ${expiredSignals.length} expired signal(s)`);

        for (const trade of expiredSignals) {
          trade.status = "REJECTED";
          trade.rejection_reason = "Signal expired (no user action within 60s)";
          trade.logs.push({
            message: "Auto-rejected: Signal expired",
            time: new Date()
          });
          await trade.save();

          if (io) {
            io.emit("trade_update", trade);
          }

          console.log(`   ❌ Expired: ${trade.trade_id}`);
        }
      }
    } catch (error) {
      console.error("❌ Signal expiry worker error:", error.message);
    }
  }, EXPIRY_CHECK_INTERVAL);
};

export const stopSignalExpiryWorker = () => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("⏹️ Signal expiry worker stopped");
  }
};
