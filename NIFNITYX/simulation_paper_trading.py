#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║         🎓 NifnityX HISTORICAL SIMULATION ENGINE — COLLEGE DEMO MODE         ║
║                                                                                ║
║  This file is a modified copy of live_paper_trading.py.                       ║
║  Instead of connecting to Angel One for live data, it reads a CSV file        ║
║  and replays candles at maximum speed — pausing only when a trade signal      ║
║  fires, giving the presenter time to demonstrate the NifnityX React UI.      ║
║                                                                                ║
║  WHAT IS PRESERVED (identical to production):                                 ║
║  ✓ All FastAPI endpoints (/execute, /set_strategy, /strategy, /health)        ║
║  ✓ Node.js webhook payload format                                             ║
║  ✓ PaperTradingEngine (with gross_pnl, total_costs, cost_breakdown)           ║
║  ✓ Multi-strategy hot-swap via StrategyFactory + threading lock               ║
║  ✓ PENDING_SIGNALS approval workflow                                          ║
║                                                                                ║
║  WHAT IS DIFFERENT:                                                           ║
║  • Data source: CSV file instead of AngelOneDataFetcher                       ║
║  • Speed: Max CPU speed for non-signal candles (no time.sleep)                ║
║  • Demo pause: 15s pause after each signal for UI demonstration               ║
║  • Timestamps: Uses simulated candle timestamps, not datetime.now()           ║
║                                                                                ║
║  Usage:                                                                       ║
║    python simulation_paper_trading.py                                         ║
║    python simulation_paper_trading.py --strategy balanced                     ║
║    python simulation_paper_trading.py --data data/NIFTY_1MIN_2025.csv         ║
║    python simulation_paper_trading.py --pause 20                              ║
║    python simulation_paper_trading.py --no-filter                             ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import os
import time
import json
import threading
import warnings

import pandas as pd
import numpy as np
import requests
import urllib3
import uvicorn
import socket
import config

from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Disable SSL warnings globally
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
warnings.filterwarnings('ignore')

# ── Core components ────────────────────────────────────────────────────────────
# NOTE: AngelOneDataFetcher is NOT imported — we read from CSV instead
from cost_calculator     import CostCalculator
from paper_trading_engine import PaperTradingEngine
from layer1_trading_bot  import TradingBot
# NOTE: Real SentimentAnalyzer fetches live news — useless for historical sim
# We use a stub that returns neutral sentiment so disaster_flag never blocks
from layer3_ml_model     import EnhancedMLTradePredictor


class SimulationSentimentAnalyzer:
    """
    Stub sentiment analyzer for historical simulation.
    Returns neutral sentiment with NO disaster flag.
    The real SentimentAnalyzer hits GNews for LIVE news, which makes no sense
    when replaying 2025 data — and its disaster keywords in 2026 articles
    would incorrectly block every signal.
    """
    def __init__(self):
        print("✅ Layer 2: Simulation Sentiment (Neutral — no live API)")

    def get_sentiment_score(self, force_refresh=False):
        return {
            'sentiment_score': 0.0,
            'sentiment_boost': 0.0,
            'disaster_flag': False,
            'article_count': 0,
            'timestamp': datetime.now(),
            'articles': [],
        }

# ── Multi-strategy system ──────────────────────────────────────────────────────
from trading_strategies import (
    StrategyFactory,
    StrategyContext,
    StrategyName,
)

# ═══════════════════════════════════════════════════════════════════════════════
#  DEMO CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

DEMO_PAUSE_SECONDS = 15   # Seconds to pause after a signal fires
# Default to full 2025 file for demo; earlier versions used 3‑months
DEFAULT_CSV_PATH   = "data/NIFTY_1MIN_2025.csv"

print("""
╔════════════════════════════════════════════════════════════════════════════════╗
║         🎓 NifnityX HISTORICAL SIMULATION — COLLEGE DEMO MODE                ║
║                  CSV Replay • Full 3-Layer Pipeline • FastAPI Active          ║
║                       Multi-Strategy Engine v2.0 (Simulation)                ║
╚════════════════════════════════════════════════════════════════════════════════╝
""")

# ── FastAPI App & Global State ─────────────────────────────────────────────────
app            = FastAPI(title="NifnityX Simulation Engine", version="2.0-sim")
PENDING_SIGNALS: dict = {}   # trade_id → {signal, ltp, ml_score, decision}
system         = None        # SimulationTradingSystem instance (set in main())

# ── Pydantic models for API endpoints ─────────────────────────────────────────
class SetStrategyRequest(BaseModel):
    strategy: str

class ExecuteTradeRequest(BaseModel):
    trade_id: str

class UpdateCapitalRequest(BaseModel):
    capital: float

class SetExecutionModeRequest(BaseModel):
    mode: str # "manual" or "auto"


# ══════════════════════════════════════════════════════════════════════════════
#  SIMULATION TRADING SYSTEM
# ══════════════════════════════════════════════════════════════════════════════

class SimulationTradingSystem:
    """
    Historical simulation engine for college demo.
    Reads CSV candles and replays them through the exact same 3-layer pipeline
    as the production LivePaperTradingSystem.

    Key difference: no AngelOne, no login, no live data.
    Candle loop runs at max speed; pauses only on signal generation.
    """

    def __init__(self, csv_path: str = DEFAULT_CSV_PATH,
                 strategy_name: str = None,
                 pause_seconds: int = DEMO_PAUSE_SECONDS):
        self.csv_path      = csv_path
        self.pause_seconds = pause_seconds
        self.INITIAL_CAPITAL = 100000

        # ── Resolve strategy ───────────────────────────────────────────────
        raw_name = (
            strategy_name
            or getattr(config, "ACTIVE_STRATEGY", None)
            or "sniper"
        )
        self.strategy = StrategyFactory.create(raw_name)

        # ── Lock for thread-safe hot-swap ──────────────────────────────────
        self._strategy_lock = threading.Lock()

        # ── Logging ────────────────────────────────────────────────────────
        self.log_dir = f"simulation_logs/{datetime.now().strftime('%Y-%m-%d_%H%M%S')}"
        os.makedirs(self.log_dir, exist_ok=True)

        # ── Daily counters ─────────────────────────────────────────────────
        self._daily_losses = 0
        self._daily_wins   = 0
        self._daily_trades = 0   # resets each day — NOT total_signals_executed
        self._current_date = None

        # ── Components ─────────────────────────────────────────────────────
        print("\n🔧 Initializing simulation components...")

        self.cost_calc    = CostCalculator(brokerage_per_order=20)
        self.paper_engine = PaperTradingEngine(
            initial_capital=self.INITIAL_CAPITAL,
            cost_calculator=self.cost_calc
        )
        self.layer1 = TradingBot(capital=self.INITIAL_CAPITAL)
        self.layer2 = SimulationSentimentAnalyzer()
        self.layer3 = EnhancedMLTradePredictor(
            model_path='3layer_results_v5/ml_model_v6.pkl'
        )

        # ── Data buffer ────────────────────────────────────────────────────
        self.historical_data  = pd.DataFrame()
        self.last_candle_time = None
        self.decisions_log    = []

        # ── Simulation stats ───────────────────────────────────────────────
        self.candles_processed = 0
        self.signals_fired     = 0
        self.sim_running       = False
        self.execution_mode    = "manual" # Default execution mode: "manual" or "auto"
        self.current_time      = None

        print(f"\n✅ Simulation initialized!")
        print(f"   Strategy:    {self.strategy.NAME.upper()}")
        print(f"   Capital:     ₹{self.INITIAL_CAPITAL:,}")
        print(f"   CSV:         {self.csv_path}")
        print(f"   Demo Pause:  {self.pause_seconds}s per signal")
        print(f"   Logs:        {self.log_dir}/")

    # ── Strategy management (IDENTICAL to production) ─────────────────────────

    def set_strategy(self, name: str) -> dict:
        """Hot-swap the active strategy at runtime (thread-safe)."""
        if not StrategyFactory.is_valid(name):
            return {
                "status": "error",
                "message": (
                    f"Invalid strategy '{name}'. "
                    f"Valid options: {StrategyFactory.available()}"
                ),
            }

        with self._strategy_lock:
            old_name      = self.strategy.NAME
            self.strategy = StrategyFactory.create(name)
            new_name      = self.strategy.NAME

        print(f"\n🔄 Strategy switched: {old_name.upper()} → {new_name.upper()}")
        return {
            "status":      "ok",
            "previous":    old_name,
            "active":      new_name,
            "switched_at": datetime.utcnow().isoformat(),
        }

    def set_execution_mode(self, mode: str) -> dict:
        """Set the execution mode ('manual' or 'auto')."""
        if mode not in ["manual", "auto"]:
            return {"status": "error", "message": "Invalid mode. Must be 'manual' or 'auto'."}

        old_mode = self.execution_mode
        self.execution_mode = mode
        print(f"\n⚙️  Execution mode switched: {old_mode.upper()} → {self.execution_mode.upper()}")
        return {
            "status": "ok",
            "previous": old_mode,
            "active": self.execution_mode,
            "switched_at": datetime.utcnow().isoformat(),
        }

    # ── Daily counter management ───────────────────────────────────────────────

    def _reset_daily_counters_if_needed(self, sim_date):
        """Reset per-day counters when the simulated date rolls over."""
        if self._current_date != sim_date:
            self._current_date = sim_date
            self._daily_losses = 0
            self._daily_wins   = 0
            self._daily_trades = 0
            # CRITICAL FIX: Reset paper engine's daily P&L tracker
            self.paper_engine.today_pnl = 0
            self.paper_engine.today_costs = 0
            print(f"\n📅 Simulated trading day: {sim_date} — daily counters reset")

    def _update_daily_result(self, trade_closed: dict):
        """Called by the trading loop after each trade closes."""
        if trade_closed.get("won"):
            self._daily_wins += 1
        else:
            self._daily_losses += 1

    # ── StrategyContext builder ─────────────────────────────────────────────────

    def _build_context(self, sim_time: datetime) -> StrategyContext:
        """
        Builds StrategyContext from current engine state.
        Uses SIMULATED time instead of datetime.now().
        """
        stats = self.paper_engine.get_daily_stats(current_time=sim_time)
        return StrategyContext(
            capital         = self.paper_engine.capital,
            initial_capital = self.INITIAL_CAPITAL,
            peak_capital    = max(
                self.paper_engine.capital,
                getattr(self.paper_engine, "peak_capital", self.INITIAL_CAPITAL),
            ),
            daily_pnl       = self.paper_engine.today_pnl,
            daily_trades    = self._daily_trades,  # daily counter, resets at midnight
            daily_losses    = self._daily_losses,
            daily_wins      = self._daily_wins,
            open_positions  = len(self.paper_engine.open_positions),
            loss_streak     = getattr(self.layer1, "loss_streak", 0),
            current_time    = sim_time,
        )

    # ── CSV Loading ────────────────────────────────────────────────────────────

    def load_csv(self, filter_days: int = 60) -> bool:
        """Load and prepare the CSV data for simulation.

        Args:
            filter_days: number of days from the end of the dataset to keep; set to
                None to disable trimming and keep the full file. Default 60 for
                backwards compatibility with earlier demos.
        """
        print(f"\n📊 Loading simulation data: {self.csv_path}")
        try:
            df = pd.read_csv(self.csv_path)

            # Parse datetime
            dt_col = df.columns[0]
            df[dt_col] = pd.to_datetime(df[dt_col])
            df = df.rename(columns={dt_col: 'datetime'})
            df = df.set_index('datetime')

            # Normalize column names
            col_map = {}
            for col in df.columns:
                cl = str(col).lower()
                if 'close' in cl: col_map[col] = 'close'
                elif 'open' in cl: col_map[col] = 'open'
                elif 'high' in cl: col_map[col] = 'high'
                elif 'low'  in cl: col_map[col] = 'low'
                elif 'vol'  in cl: col_map[col] = 'volume'
            df = df.rename(columns=col_map)

            # Optional trimming
            if filter_days is not None:
                min_date = df.index.max() - pd.Timedelta(days=filter_days)
                df = df[df.index >= min_date]
                print(f"   (trimmed to last {filter_days} days)")

            self._sim_data = df
            print(f"✅ Loaded {len(df):,} candles")
            print(f"   Date range: {df.index.min()} → {df.index.max()}")
            return True
        except Exception as e:
            print(f"❌ Failed to load CSV: {e}")
            return False

    # ── Candle processing (uses simulated timestamp) ───────────────────────────

    def process_candle(self, candle: dict, sim_timestamp: datetime):
        """Process a single candle through the full 3-layer pipeline.
        Note: update_positions() is called BEFORE this in the main loop.
        """
        self._reset_daily_counters_if_needed(sim_timestamp.date())

        new_row = pd.DataFrame([{
            'open':   candle['open'],
            'high':   candle['high'],
            'low':    candle['low'],
            'close':  candle['close'],
            'volume': candle.get('volume', 0),
        }], index=[sim_timestamp])

        self.historical_data = pd.concat([self.historical_data, new_row]).tail(500)
        self.historical_data = self.layer1.calculate_indicators(self.historical_data)

        idx    = len(self.historical_data) - 1
        signal = self.layer1.generate_signal(self.historical_data, idx)

        if signal:
            print(f"\n🎯 SIGNAL GENERATED — {sim_timestamp}")
            print(f"   {signal['action']} @ ₹{signal['price']:,.2f}")
            print(f"   Stop: ₹{signal['stop']:,.2f} | Target: ₹{signal['target']:,.2f}")
            print(f"   Setup: {signal.get('setup', 'unknown')}")
            self.evaluate_signal(signal, candle['close'], sim_timestamp)
            return True   # Signal fired
        else:
            return False  # No signal

    # ── Core evaluation (IDENTICAL webhook logic) ──────────────────────────────

    def evaluate_signal(self, signal: dict, current_price: float, sim_time: datetime):
        """
        Evaluate signal through 3-layer + strategy pipeline.
        Webhook payload format is IDENTICAL to production.
        Uses simulated timestamp for StrategyContext.
        """
        with self._strategy_lock:
            active_strategy = self.strategy

        # ── Layer 2: Sentiment ─────────────────────────────────────────────
        sentiment_data = self.layer2.get_sentiment_score()

        # ── Layer 3: ML ────────────────────────────────────────────────────
        features = signal.get('features', {})
        ml_data  = self.layer3.predict_trade_quality(features)

        # ── Strategy evaluation ────────────────────────────────────────────
        context  = self._build_context(sim_time)
        decision = active_strategy.evaluate(signal, sentiment_data, ml_data, context)

        # Unpack
        execute         = decision['execute']
        reason          = decision['reason']
        lots            = decision['lots']
        technical_score = decision['technical_score']
        sentiment_score = decision['sentiment_score']
        ml_score        = decision['ml_score']
        final_score     = decision['final_score']
        disaster_flag   = decision['disaster_flag']
        risk_blocked    = decision['risk_blocked']
        strategy_name   = decision['strategy_name']

        # ── Console output ─────────────────────────────────────────────────
        print(f"\n📊 3-LAYER EVALUATION  [{strategy_name.upper()}]:")
        print(f"   Technical: {technical_score:.1f}/100")
        print(f"   Sentiment: {sentiment_score:+.1f}/20")
        print(f"   ML Score:  {ml_score:.1f}/40")
        print(f"   ─────────────────────────────")
        print(f"   FINAL:     {final_score:.1f}/160")
        if risk_blocked:
            print(f"   ⛔ RISK GATE: {reason}")
        else:
            print(f"   Decision:  {reason}")

        # ── Log entry ─────────────────────────────────────────────────────
        log_entry = {
            'timestamp':       sim_time,
            'signal':          signal,
            'technical_score': technical_score,
            'sentiment_score': sentiment_score,
            'ml_score':        ml_score,
            'final_score':     final_score,
            'disaster_flag':   disaster_flag,
            'execute':         execute,
            'reason':          reason,
            'risk_blocked':    risk_blocked,
            'strategy':        strategy_name,
            'lots':            lots,
        }
        self.decisions_log.append(log_entry)
        self.save_decision(log_entry)

        # ── Execute path ───────────────────────────────────────────────────
        if not execute:
            # Nothing to do — the main loop calls update_positions every candle
            # DO NOT call update_positions here with (current_price, sim_time)
            # because update_positions expects a candle dict, not a float.
            return False

        trade_id = f"SIM-{int(time.time())}-{self.signals_fired}"

        # ── Node.js payload (format UNCHANGED from production) ─────────────
        payload = {
            "trade_id":   trade_id,
            "symbol":     "NIFTY",
            "action":     signal['action'],
            "setup_name": signal.get('setup', f'ML_{strategy_name}'),
            "strategy":   strategy_name,
            "entry": {
                "price":     current_price,
                "time":      sim_time.isoformat(),
                "stop_loss": signal.get('stop'),
            },
            "confidence_score": {
                "total": float(final_score),
                "max":   160,
                "breakdown": {
                    "technical": float(technical_score),
                    "sentiment": float(sentiment_score),
                    "ml":        float(ml_score),
                },
            },
            "lots":        int(round(lots)),
            "lots_exact":  float(lots),
            "constraints": {"slippage_per": 0.5},
        }

        # Add execution_mode to payload
        payload["execution_mode"] = self.execution_mode
        
        # Store for Node.js approval
        PENDING_SIGNALS[trade_id] = {
            "signal":   signal,
            "ltp":      current_price,
            "ml_score": ml_score,
            "lots":     lots,
            "decision": decision,
            "execution_mode": self.execution_mode,
        }

        # ── Send to Node.js Mission Control ────────────────────────────────
        try:
            requests.post(
                f"{config.NODE_API_URL}/signal",
                json=payload,
                headers={"x-python-secret": config.NODE_SECRET},
                timeout=5,
                verify=False,
            )
            print(f"\n📡 Signal sent to Mission Control: {trade_id}")
            print(f"   Strategy: {strategy_name.upper()} | Lots: {lots} | Score: {final_score:.1f}")
        except Exception as e:
            print(f"\n⚠️  Could not reach Mission Control: {e}")
            print(f"   ↪ Executing trade locally as fallback...")
            result = self.paper_engine.execute_signal(signal, current_price, ml_score, current_time=self.current_time)
            if result:
                result['trade_id'] = trade_id
            log_entry['execution_result'] = result
            PENDING_SIGNALS.pop(trade_id, None)

        self.signals_fired += 1
        return True  # Signal was sent

    # ── Simulation Loop ────────────────────────────────────────────────────────

    def run_simulation(self):
        """
        Main simulation loop. Runs in a daemon thread.

        - Non-signal candles: MAX SPEED (no sleep)
        - Signal candles: pauses for DEMO_PAUSE_SECONDS so the presenter
          can show the NifnityX UI, explain ML scores, and click Approve.
        """
        print("\n" + "=" * 80)
        print("🎓 STARTING HISTORICAL SIMULATION".center(80))
        print("=" * 80)
        print(f"\n   Strategy:    {self.strategy.NAME.upper()}")
        print(f"   Data:        {len(self._sim_data):,} candles")
        print(f"   Demo Pause:  {self.pause_seconds}s per signal")
        print(f"   Press Ctrl+C to stop\n")

        self.sim_running = True

        # Filter to market hours only (9:15 AM to 3:30 PM)
        df = self._sim_data.copy()

        # Need at minimum ~100 candles for indicator warmup
        warmup_count = min(200, len(df))
        print(f"   Warming up with first {warmup_count} candles...")

        try:
            for i, (timestamp, row) in enumerate(df.iterrows()):
                if not self.sim_running:
                    print("\n⏹️  Simulation stopped externally")
                    break

                # Filter market hours (9:15–15:30 IST)
                hour, minute = timestamp.hour, timestamp.minute
                if hour < 9 or hour > 15:
                    continue
                if hour == 9 and minute < 15:
                    continue
                if hour == 15 and minute > 30:
                    continue

                candle = {
                    'open':      float(row['open']),
                    'high':      float(row['high']),
                    'low':       float(row['low']),
                    'close':     float(row['close']),
                    'volume':    float(row.get('volume', 0)),
                    'timestamp': timestamp,
                }

                self.candles_processed += 1
                self.current_time = timestamp

                # Progress report every 1000 candles
                if self.candles_processed % 1000 == 0:
                    stats = self.paper_engine.get_daily_stats(current_time=self.current_time)
                    cumulative_pnl = self.paper_engine.capital - self.INITIAL_CAPITAL
                    print(
                        f"\r⏩ Processed {self.candles_processed:,} candles "
                        f"| Signals: {self.signals_fired} "
                        f"| P&L: ₹{cumulative_pnl:+,.0f} "
                        f"| Strategy: {self.strategy.NAME.upper()} "
                        f"| {timestamp.strftime('%Y-%m-%d %H:%M')}",
                        end='', flush=True
                    )

                # Process candle through the pipeline
                try:
                    # CRITICAL: Update open positions FIRST (check stop/target hits)
                    # This replicates the backtest loop from integration.py
                    if self.paper_engine.open_positions:
                        self.paper_engine.update_positions(candle, timestamp)
                    
                    # Then check for new signals
                    signal_fired = self.process_candle(candle, timestamp)
                        
                except Exception as e:
                    # Log error but continue; a single bad candle shouldn't kill the demo
                    print(f"⚠️  Error processing candle at {timestamp}: {e}")
                    signal_fired = False

                if signal_fired and PENDING_SIGNALS:
                    # ══════════════════════════════════════════════════════════
                    #  DEMO PAUSE WITH POLLING — Wait for user approval
                    # ══════════════════════════════════════════════════════════
                    self.show_status()
                    
                    # Get the last trade_id we sent
                    trade_ids = list(PENDING_SIGNALS.keys())
                    if trade_ids:
                        current_trade_id = trade_ids[-1]

                        # ── AUTO MODE: Node.js already called /execute via webhook ──
                        # Don't waste 60s polling. The /execute endpoint already:
                        # 1. Popped trade_id from PENDING_SIGNALS
                        # 2. Called paper_engine.execute_signal()
                        # 3. Assigned trade_id to open_positions[-1]
                        # We just need to wait briefly for the webhook to arrive.
                        if self.execution_mode == "auto":
                            print(f"\n⚡ AUTO MODE: Signal {current_trade_id}")
                            print(f"   Waiting 3s for webhook execution...")
                            time.sleep(3)
                            # Clean up if webhook hasn't fired yet (safety net)
                            if current_trade_id in PENDING_SIGNALS:
                                print(f"   ⚠️  Webhook not received in 3s — executing locally")
                                ctx = PENDING_SIGNALS.pop(current_trade_id, None)
                                if ctx:
                                    result = self.paper_engine.execute_signal(
                                        ctx['signal'], ctx['ltp'], ctx['ml_score'],
                                        current_time=self.current_time
                                    )
                                    if result and result.get('executed') and self.paper_engine.open_positions:
                                        self.paper_engine.open_positions[-1]['trade_id'] = current_trade_id
                            print(f"   ▶️  Resuming simulation...\n")

                        else:
                            # ── MANUAL MODE: Poll for user Approve / Reject ──────
                            print(f"\n⏸️  WAITING FOR APPROVAL: {current_trade_id}")
                            print(f"   Checking every 2 seconds (max 60s)...")
                            
                            signal_approved = False
                            signal_rejected = False
                            
                            # Poll for up to 60 seconds (30 attempts × 2s)
                            for poll_attempt in range(30):
                                time.sleep(2)  # Poll every 2 seconds
                                
                                # If webhook already executed this trade, stop polling
                                if current_trade_id not in PENDING_SIGNALS:
                                    print(f"✅ Trade {current_trade_id} executed via webhook")
                                    signal_approved = True
                                    break

                                try:
                                    # Check signal status in DB
                                    response = requests.get(
                                        f"{config.NODE_API_URL}/trades/{current_trade_id}",
                                        headers={"x-python-secret": config.NODE_SECRET},
                                        timeout=5,
                                        verify=False,
                                    )
                                    if response.status_code == 200:
                                        trade_data = response.json()
                                        status = trade_data.get('status', '')
                                        
                                        if status == 'OPEN':
                                            # Trade was approved - execute it
                                            print(f"✅ Trade APPROVED! Executing trade {current_trade_id}")
                                            
                                            # Execute the trade in paper engine
                                            ctx = PENDING_SIGNALS.pop(current_trade_id, None)
                                            if ctx:
                                                result = self.paper_engine.execute_signal(
                                                    ctx['signal'],
                                                    ctx['ltp'],
                                                    ctx['ml_score'],
                                                    current_time=self.current_time
                                                )
                                                if result and result.get('executed'):
                                                    result['trade_id'] = current_trade_id
                                                    # Sync trade_id to position
                                                    if self.paper_engine.open_positions:
                                                        self.paper_engine.open_positions[-1]['trade_id'] = current_trade_id
                                            
                                            signal_approved = True
                                            break
                                            
                                        elif status == 'REJECTED':
                                            print(f"❌ Trade REJECTED by user")
                                            signal_rejected = True
                                            PENDING_SIGNALS.pop(current_trade_id, None)
                                            break
                                            
                                except Exception as e:
                                    print(f"⚠️ Poll check failed: {e}")
                                    continue
                            
                            if not signal_approved and not signal_rejected:
                                print(f"⏰ Signal EXPIRED after 60s - no user action")
                                PENDING_SIGNALS.pop(current_trade_id, None)
                        
                            print(f"   ▶️  Resuming simulation...\n")

                # NO time.sleep() for non-signal candles → max CPU speed

        except KeyboardInterrupt:
            print("\n\n⏹️  Simulation stopped by user")

        # ── End of simulation ──────────────────────────────────────────────
        print("\n\n🏁 SIMULATION COMPLETE")
        print("🌐 Keeping FastAPI server alive for manual exits/analytics testing (UI).")
        while True:
            time.sleep(1)
        self.sim_running = False
        self._end_simulation()

    def _end_simulation(self):
        """Generate final simulation report."""
        print("\n" + "=" * 80)
        print("📊 SIMULATION COMPLETE".center(80))
        print("=" * 80)

        stats = self.paper_engine.get_daily_stats(current_time=self.current_time)

        # Force close remaining positions at last known price
        if self.paper_engine.open_positions:
            last_close = self._sim_data['close'].iloc[-1]
            self.paper_engine.force_close_all(last_close, "SIM_END", current_time=self.current_time)
            stats = self.paper_engine.get_daily_stats(current_time=self.current_time)

        print(f"\n   Candles Processed:  {self.candles_processed:,}")
        print(f"   Signals Generated:  {self.signals_fired}")
        print(f"   Trades Completed:   {stats['trades_completed']}")
        print(f"   Win Rate:           {stats['win_rate']:.1f}%")
        print(f"   Net P&L:            ₹{stats['net_pnl']:+,.2f}")
        print(f"   Capital:            ₹{stats['capital']:,.2f} ({stats['return_pct']:+.2f}%)")
        print(f"   Strategy:           {self.strategy.NAME.upper()}")

        self.paper_engine.save_trades(f"{self.log_dir}/simulation_trades.csv")
        print(f"\n   Trades saved:       {self.log_dir}/simulation_trades.csv")
        print("=" * 80)

    # ── Utility (shared with production) ───────────────────────────────────────

    def show_status(self):
        stats = self.paper_engine.get_daily_stats()
        print(f"\n📈 SIM STATS  [{self.strategy.NAME.upper()}]:")
        print(f"   Candles: {self.candles_processed:,} | Signals: {self.signals_fired}")
        print(f"   Trades:  {stats['trades_completed']} | Win Rate: {stats['win_rate']:.1f}%")
        print(f"   Net P&L: ₹{stats['net_pnl']:+,.2f}")
        print(f"   Capital: ₹{stats['capital']:,.2f} ({stats['return_pct']:+.2f}%)")
        print(f"   Open:    {stats['open_positions']}")

    def save_decision(self, decision: dict):
        log_file = f"{self.log_dir}/decisions.jsonl"
        try:
            with open(log_file, 'a') as f:
                json.dump({
                    'timestamp':       str(decision['timestamp']),
                    'action':          decision['signal']['action'],
                    'price':           decision['signal']['price'],
                    'technical_score': decision['technical_score'],
                    'sentiment_score': decision['sentiment_score'],
                    'ml_score':        decision['ml_score'],
                    'final_score':     decision['final_score'],
                    'execute':         decision['execute'],
                    'reason':          decision['reason'],
                    'strategy':        decision.get('strategy', 'sniper'),
                    'lots':            decision.get('lots', 0.5),
                    'risk_blocked':    decision.get('risk_blocked', False),
                }, f)
                f.write('\n')
        except Exception as e:
            print(f"⚠️  Could not save decision: {e}")


# ══════════════════════════════════════════════════════════════════════════════
#  FASTAPI ENDPOINTS (IDENTICAL to production live_paper_trading.py)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/execute")
def execute_trade(data: ExecuteTradeRequest):
    """Node.js sends trade_id to approve a pending trade."""
    trade_id = data.trade_id
    if trade_id not in PENDING_SIGNALS:
        return {"status": "not_found", "message": f"No pending signal for {trade_id}"}

    context = PENDING_SIGNALS.pop(trade_id)
    result  = system.paper_engine.execute_signal(
        context['signal'],
        context['ltp'],
        context['ml_score'],
        current_time=system.current_time,
    )
    
    if result and result.get('executed'):
        result['trade_id'] = trade_id
        system._daily_trades += 1   # increment daily counter (not cumulative total)
        if system.paper_engine.open_positions:
            system.paper_engine.open_positions[-1]['trade_id'] = trade_id
            print(f"\n✅ Executed Trade {trade_id} via Webhook - Position added successfully")
        else:
            print(f"\n⚠️ WARNING: execute_signal returned success but no position in open_positions!")
            print(f"   Result: {result}")
    else:
        print(f"\n❌ execute_signal FAILED for {trade_id}")
        print(f"   Result: {result}")

    return {"status": "executed", "trade_id": trade_id}


@app.post("/set_strategy")
def set_strategy(req: SetStrategyRequest):
    """Hot-swap the active strategy at runtime."""
    if system is None:
        raise HTTPException(status_code=503, detail="Simulation not initialised")

    result = system.set_strategy(req.strategy)

    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    return result


@app.post("/exit")
def exit_trade(data: ExecuteTradeRequest):
    """
    Node.js sends trade_id to manually exit an open position.
    Calculates P&L directly, closes position, and sends an EXPLICIT
    update to Node.js so the trade is marked WIN/LOSS (not stuck on EXITING).

    BUG FIX: Previously returned only {"status": "closed"} with no P&L or
    WIN/LOSS status, so Node.js had nothing to update with → trade stayed
    "EXITING" forever.
    """
    if system is None:
        raise HTTPException(status_code=503, detail="Simulation not initialised")

    trade_id = data.trade_id
    POINT_VALUE = 75  # NIFTY: 1 point = ₹75

    # ── Find the matching open position ──────────────────────────────────────
    for idx, pos in enumerate(system.paper_engine.open_positions):
        if pos.get('trade_id') == trade_id:

            # ── Step 1: Determine exit price ──────────────────────────────
            if system.historical_data is not None and len(system.historical_data) > 0:
                exit_price = float(system.historical_data['close'].iloc[-1])
            else:
                exit_price = float(pos.get('entry_price', 0))

            exit_time = system.current_time or datetime.now()

            # ── Step 2: Calculate P&L ─────────────────────────────────────
            action      = str(pos.get('action', 'BUY')).upper()
            entry_price = float(pos.get('entry_price', exit_price))
            lots        = float(pos.get('lots', 1.0))

            if action == 'BUY':
                gross_pnl = (exit_price - entry_price) * lots * POINT_VALUE
            else:  # SELL
                gross_pnl = (entry_price - exit_price) * lots * POINT_VALUE

            # ── Step 3: Estimate transaction costs ────────────────────────
            try:
                cost_data   = system.cost_calc.calculate_total_costs(
                    entry_price, exit_price, lots, action.lower()
                )
                total_costs = float(cost_data.get('total', 40)) if isinstance(cost_data, dict) else float(cost_data)
            except Exception:
                # Fallback: ₹20 brokerage × 2 sides = ₹40 minimum
                total_costs = 40.0

            net_pnl = gross_pnl - total_costs
            won     = net_pnl > 0

            # ── Step 4: Close position in paper engine ────────────────────
            # close_position() updates capital, stats, and may also try to
            # notify Node.js via _send_update_to_node() — but that uses the
            # internal TRD_N id, NOT the SIM-xxx id Node.js knows.
            # We send our OWN explicit update below to guarantee it arrives.
            system.paper_engine.close_position(idx, exit_price, "MANUAL_EXIT", exit_time)

            # ── Step 5: Send EXPLICIT update to Node.js ───────────────────
            # This is the key fix: the paper_engine's internal update uses
            # TRD_N which Node.js cannot match. We send a separate update
            # using the correct SIM-xxx trade_id with all required fields.
            update_payload = {
                "trade_id":    trade_id,
                "status":      "WIN" if won else "LOSS",
                "exit": {
                    "price":  exit_price,
                    "time":   exit_time.isoformat(),
                    "reason": "MANUAL_EXIT",
                },
                "pnl":         round(net_pnl, 2),
                "gross_pnl":   round(gross_pnl, 2),
                "total_costs": round(total_costs, 2),
                "won":         won,
            }
            try:
                requests.post(
                    f"{config.NODE_API_URL}/update",
                    json=update_payload,
                    headers={"x-python-secret": config.NODE_SECRET},
                    timeout=5,
                    verify=False,
                )
                print(f"\n📡 Exit update sent to Mission Control: {trade_id} → {'WIN' if won else 'LOSS'}")
            except Exception as e:
                print(f"\n⚠️  Could not send exit update to Node.js: {e}")
                print(f"   Trade IS closed locally. P&L: ₹{net_pnl:+,.2f}")

            print(
                f"\n🔴 MANUAL EXIT: {action} {lots} Lot\n"
                f"   {trade_id}\n"
                f"   Entry: ₹{entry_price:,.2f} → Exit: ₹{exit_price:,.2f}\n"
                f"   Gross P&L: ₹{gross_pnl:+,.2f}\n"
                f"   Costs:     ₹{total_costs:,.2f}\n"
                f"   Net P&L:   ₹{net_pnl:+,.2f}\n"
                f"   Capital:   ₹{system.paper_engine.capital:,.2f}"
            )

            # ── Step 6: Return FULL response (not just {"status":"closed"}) ─
            return {
                "status":      "closed",
                "trade_id":    trade_id,
                "exit_price":  exit_price,
                "entry_price": entry_price,
                "action":      action,
                "pnl":         round(net_pnl, 2),
                "gross_pnl":   round(gross_pnl, 2),
                "total_costs": round(total_costs, 2),
                "won":         won,
                "exit_reason": "MANUAL_EXIT",
                "exit_time":   exit_time.isoformat(),
            }

    # ── Position not found ────────────────────────────────────────────────────
    # Could already be closed (stop/target hit race). Check closed_trades.
    print(f"\n⚠️  EXIT: No open position found for {trade_id}")
    print(f"   (May have already closed via STOP_HIT/TARGET_HIT)")

    # Try to find in closed trades to send a late update
    try:
        closed = getattr(system.paper_engine, 'closed_trades', [])
        for ct in reversed(closed):
            if ct.get('trade_id') == trade_id:
                ct_pnl = float(ct.get('net_pnl', ct.get('pnl', 0)))
                update_payload = {
                    "trade_id": trade_id,
                    "status":   "WIN" if ct_pnl > 0 else "LOSS",
                    "exit": {
                        "price":  float(ct.get('exit_price', 0)),
                        "time":   str(ct.get('exit_time', datetime.now().isoformat())),
                        "reason": str(ct.get('exit_reason', 'STOP_HIT')),
                    },
                    "pnl":       round(ct_pnl, 2),
                    "gross_pnl": round(float(ct.get('gross_pnl', ct_pnl)), 2),
                    "won":       ct_pnl > 0,
                }
                requests.post(
                    f"{config.NODE_API_URL}/update",
                    json=update_payload,
                    headers={"x-python-secret": config.NODE_SECRET},
                    timeout=5,
                    verify=False,
                )
                print(f"   ↪ Found in closed trades, sent late update: ₹{ct_pnl:+,.2f}")
                return {"status": "already_closed", "trade_id": trade_id, "pnl": round(ct_pnl, 2)}
    except Exception as ex:
        print(f"   ↪ Could not recover from closed trades: {ex}")

    return {"status": "not_found", "message": f"No open position with trade_id {trade_id}"}


@app.get("/strategy")
def get_strategy():
    """Return the currently active strategy and all available options."""
    if system is None:
        raise HTTPException(status_code=503, detail="Simulation not initialised")
    return {
        "active":    system.strategy.NAME,
        "available": StrategyFactory.available(),
        "execution_mode": system.execution_mode,
    }

@app.post("/set_mode")
def set_mode(req: dict):
    """Hot-swap the execution mode (auto/manual)."""
    if system is None:
        raise HTTPException(status_code=503, detail="Simulation not initialised")
    
    mode = req.get("mode")
    if mode in ["auto", "manual"]:
        system.execution_mode = mode
        print(f"\n⚙️  Execution Mode Updated: {mode.upper()}")
        return {"status": "success", "mode": mode}
    raise HTTPException(status_code=400, detail="Invalid mode")

@app.post("/update_capital")
def update_capital(data: UpdateCapitalRequest):
    """Node.js sends new capital value."""
    if data.capital is not None and system:
        system.paper_engine.capital = float(data.capital)
        print(f"\n💰 Capital Updated: ₹{data.capital:,}")
        return {"status": "updated", "capital": data.capital}
    return {"status": "error", "message": "Missing capital value"}


@app.get("/health")
def health_check():
    """Health check endpoint."""
    stats = system.paper_engine.get_daily_stats(current_time=system.current_time) if system else {}
    return {
        "status":           "running" if (system and system.sim_running) else "idle",
        "mode":             "simulation",
        "strategy":         system.strategy.NAME if system else None,
        "candles_processed": system.candles_processed if system else 0,
        "signals_fired":    system.signals_fired if system else 0,
        "pending_signals":  len(PENDING_SIGNALS),
        "engine_stats":     stats,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main():
    global system

    import argparse
    parser = argparse.ArgumentParser(
        description="NifnityX Historical Simulation (College Demo)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--strategy",
        type=str,
        default=None,
        choices=StrategyFactory.available(),
        help=f"Strategy to use (default: config.ACTIVE_STRATEGY or 'sniper'). "
             f"Options: {StrategyFactory.available()}",
    )
    parser.add_argument(
        "--data",
        type=str,
        default=DEFAULT_CSV_PATH,
        help=f"Path to CSV file (default: {DEFAULT_CSV_PATH})",
    )
    parser.add_argument(
        "--pause",
        type=int,
        default=DEMO_PAUSE_SECONDS,
        help=f"Seconds to pause after each signal (default: {DEMO_PAUSE_SECONDS})",
    )
    parser.add_argument(
        "--no-filter",
        action="store_true",
        help="Disable 60‑day trimming of the CSV; useful when replaying full-year data",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Port for FastAPI server (default reads config.PYTHON_PORT or picks a free port if that one is busy)",
    )
    args = parser.parse_args()

    system = SimulationTradingSystem(
        csv_path=args.data,
        strategy_name=args.strategy,
        pause_seconds=args.pause,
    )

    # No login/warmup needed — just load CSV
    filter_days = None if args.no_filter else 60
    if not system.load_csv(filter_days=filter_days):
        print("❌ Failed to load simulation data — exiting")
        return

    # ── Determine port, avoid conflicts ─────────────────────────────────
    port = args.port or config.PYTHON_PORT

    def _port_available(p):
        # Attempt to connect to localhost:p.  If connection succeeds, something is
        # listening and the port is _not_ available.  If connection is refused,
        # the port is free.  This avoids binding sockets which leave them in
        # TIME_WAIT and later cause uvicorn to fail.
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            try:
                s.connect(("127.0.0.1", p))
                return False  # listener present
            except (ConnectionRefusedError, OSError):
                return True   # no service

    if not _port_available(port):
        # pick ephemeral free port using OS
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("0.0.0.0", 0))
            port = s.getsockname()[1]
        print(f"⚠️  Port {args.port or config.PYTHON_PORT} already in use, switching to {port}")

    config.PYTHON_PORT = port

    update_instruction = (
        f"\n⚠️  Make sure your Node.js backend uses the same URL for PYTHON_EXECUTION_URL:\n"
        f"    export PYTHON_EXECUTION_URL=http://localhost:{port}/api/trade  # unix\n"
        f"    setx PYTHON_EXECUTION_URL http://localhost:{port}/api/trade  # windows\n"
        f""
    )
    print(update_instruction)

    # Simulation loop runs in background; FastAPI on main thread
    t = threading.Thread(target=system.run_simulation, daemon=True)
    t.start()

    print(f"\n🌐 FastAPI server starting on port {config.PYTHON_PORT}...")
    print(f"   Swagger UI:   http://localhost:{config.PYTHON_PORT}/docs")
    print(f"   Health:       http://localhost:{config.PYTHON_PORT}/health")
    print(f"   Strategy:     http://localhost:{config.PYTHON_PORT}/strategy")
    print(f"   Set Strategy: POST /set_strategy {{\"strategy\": \"balanced\"}}")

    try:
        uvicorn.run(app, host="0.0.0.0", port=config.PYTHON_PORT)
    except OSError as e:
        print(f"⚠️  Could not start FastAPI on port {config.PYTHON_PORT}: {e}")
        print("   The simulation will continue but UI/webhook endpoints will be unavailable.")


if __name__ == "__main__":
    main()