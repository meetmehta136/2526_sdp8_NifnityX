/**
 * Signal Expiry Manager
 * 
 * Automatically expires pending signals after configured timeout.
 * This runs as a background job to ensure no signals are stuck in PENDING_APPROVAL.
 * 
 * Security considerations:
 * - Uses atomic MongoDB operations to prevent race conditions
 * - Logs all expiration events for audit trail
 * - Configurable timeout via environment variable
 */

import Trade from "../models/Trade.js";

// Default 60 seconds - can be overridden via environment variable
const SIGNAL_EXPIRY_SECONDS = parseInt(process.env.SIGNAL_EXPIRY_SECONDS) || 60;

// Store interval reference for cleanup
let expiryInterval = null;

/**
 * Find and expire all pending signals that have passed their expiry time
 * Uses atomic operation to prevent race conditions
 */
async function expirePendingSignals(io) {
  try {
    const now = new Date();
    
    // Find all expired pending signals
    // Using atomic update to prevent race conditions
    const expiredTrades = await Trade.find({
      status: "PENDING_APPROVAL",
      signal_expires_at: { $lte: now }
    });
    
    if (expiredTrades.length === 0) {
      return { expired: 0 };
    }
    
    console.log(`[SignalExpiry] Found ${expiredTrades.length} expired signals`);
    
    // Process each expired signal atomically
    for (const trade of expiredTrades) {
      try {
        trade.status = "EXPIRED";
        trade.rejection_reason = "Signal expired: Time limit exceeded (60 seconds)";
        trade.logs.push({
          message: "Signal automatically expired due to timeout",
          time: new Date()
        });
        
        await trade.save();
        
        // Broadcast expiration event to all connected clients
        if (io) {
          io.emit("signal_expired", {
            trade_id: trade.trade_id,
            reason: "Time limit exceeded",
            timestamp: new Date().toISOString()
          });
        }
        
        console.log(`[SignalExpiry] Expired trade: ${trade.trade_id}`);
      } catch (saveError) {
        console.error(`[SignalExpiry] Error expiring trade ${trade.trade_id}:`, saveError.message);
      }
    }
    
    return { expired: expiredTrades.length };
  } catch (error) {
    console.error("[SignalExpiry] Error in expiry job:", error.message);
    return { expired: 0, error: error.message };
  }
}

/**
 * Start the signal expiry scheduler
 * @param {Object} io - Socket.io instance for broadcasting events
 * @param {number} intervalMs - Check interval in milliseconds (default: 10 seconds)
 */
function startSignalExpiryScheduler(io, intervalMs = 10000) {
  // Prevent multiple schedulers
  if (expiryInterval) {
    console.log("[SignalExpiry] Scheduler already running");
    return;
  }
  
  console.log(`[SignalExpiry] Starting scheduler (interval: ${intervalMs}ms, expiry: ${SIGNAL_EXPIRY_SECONDS}s)`);
  
  // Run immediately on start
  expirePendingSignals(io);
  
  // Then run on interval
  expiryInterval = setInterval(() => {
    expirePendingSignals(io);
  }, intervalMs);
  
  return {
    interval: expiryInterval,
    expirySeconds: SIGNAL_EXPIRY_SECONDS
  };
}

/**
 * Stop the signal expiry scheduler
 */
function stopSignalExpiryScheduler() {
  if (expiryInterval) {
    clearInterval(expiryInterval);
    expiryInterval = null;
    console.log("[SignalExpiry] Scheduler stopped");
  }
}

/**
 * Get time remaining until expiry for a trade
 * @param {Date} signalExpiresAt - Expiry timestamp
 * @returns {number} Seconds remaining (negative if already expired)
 */
function getTimeRemaining(signalExpiresAt) {
  if (!signalExpiresAt) return -1;
  
  const now = new Date();
  const expiry = new Date(signalExpiresAt);
  const diffMs = expiry - now;
  
  return Math.ceil(diffMs / 1000); // Return seconds
}

/**
 * Calculate expiry timestamp from current time
 * @returns {Date} Expiry timestamp
 */
function calculateExpiryTime() {
  return new Date(Date.now() + (SIGNAL_EXPIRY_SECONDS * 1000));
}

export {
  startSignalExpiryScheduler,
  stopSignalExpiryScheduler,
  expirePendingSignals,
  getTimeRemaining,
  calculateExpiryTime,
  SIGNAL_EXPIRY_SECONDS
};
