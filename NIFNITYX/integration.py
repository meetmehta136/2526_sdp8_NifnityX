#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  🚀 3-LAYER TRADING SYSTEM v5.2 — MULTI-STRATEGY BACKTEST ENGINE              ║
║  File: integration.py                                                         ║
║                                                                                ║
║  STRATEGY SUPPORT:                                                             ║
║  - sniper       (default — exact original behaviour)                          ║
║  - balanced     (moderate frequency, loss-streak protection)                  ║
║  - aggressive   (high frequency, auto-degrades on drawdown)                   ║
║  - conservative (low frequency, time-window + loss lockout)                   ║
║                                                                                ║
║  WORKFLOW:                                                                     ║
║  python integration.py --mode=collect_data                                    ║
║  python integration.py --mode=train_ml                                        ║
║  python integration.py --mode=full_backtest --strategy=balanced               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, date
import argparse
import config
import glob
import json

from layer1_trading_bot import TradingBot
from layer2_sentiment   import SentimentAnalyzer
from layer3_ml_model    import EnhancedMLTradePredictor

# ── Strategy system ────────────────────────────────────────────────────────────
from trading_strategies import (
    StrategyFactory,
    StrategyContext,
    StrategyName,
)

print("""
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                🚀 3-LAYER SMART TRADING SYSTEM v5.2                           ║
║              MULTI-STRATEGY + ML-BASED DYNAMIC LOT SIZING                     ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
""")


# ══════════════════════════════════════════════════════════════════════════════
#  LIVE ML DATA COLLECTOR  (unchanged — strategy-neutral)
# ══════════════════════════════════════════════════════════════════════════════

class LiveMLDataCollector:
    """
    Collects ML training data in real-time during backtesting.
    Records EVERY signal (executed + skipped) with all features and outcomes.
    Strategy-neutral — always uses Sniper thresholds for data collection
    so the training set is consistent regardless of which strategy runs.
    """

    def __init__(self, output_dir="3layer_ml_data"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.signals       = []
        self.pending_trades = {}
        self.year_data     = {}
        print(f"📊 Live ML Data Collector initialized  →  {output_dir}/")

    def record_signal(self, signal, technical_score, sentiment_score, ml_score,
                      final_score, executed, disaster_flag, timestamp):
        features = signal.get('features', {})
        record   = {
            'timestamp':    str(timestamp),
            'year':         timestamp.year,
            'month':        timestamp.month,
            'day':          timestamp.day,
            'hour':         timestamp.hour,
            'minute':       timestamp.minute,
            'day_of_week':  timestamp.dayofweek,
            'action':       signal['action'],
            'price':        float(signal['price']),
            'stop':         float(signal['stop']),
            'target':       float(signal['target']),
            'rr':           float(signal.get('rr', 0)),
            'setup':        signal.get('setup', 'unknown'),
            'regime':       signal.get('regime', 'unknown'),
            'close':        float(features.get('close', 0)),
            'atr_pct':      float(features.get('atr_pct', 0)),
            'rsi':          float(features.get('rsi', 50)),
            'adx':          float(features.get('adx', 25)),
            'macd':         float(features.get('macd', 0)),
            'macd_hist':    float(features.get('macd_hist', 0)),
            'bb_position':  float(features.get('bb_position', 0.5)),
            'bb_width':     float(features.get('bb_width', 0)),
            'mom10':        float(features.get('mom10', 0)),
            'mom20':        float(features.get('mom20', 0)),
            'dist_ema9':    float(features.get('dist_ema9', 0)),
            'dist_ema21':   float(features.get('dist_ema21', 0)),
            'dist_ema50':   float(features.get('dist_ema50', 0)),
            'trend_up':     int(features.get('trend_up', 0)),
            'trend_down':   int(features.get('trend_down', 0)),
            'drawdown_pct': float(features.get('drawdown_pct', 0)),
            'daily_trades': int(features.get('daily_trades', 0)),
            'portfolio_heat': float(features.get('portfolio_heat', 0)),
            'win_streak':   int(features.get('win_streak', 0)),
            'loss_streak':  int(features.get('loss_streak', 0)),
            'recent_win_rate': float(features.get('recent_win_rate', 0.5)),
            'technical_score': float(technical_score),
            'sentiment_score': float(sentiment_score),
            'ml_score':        float(ml_score),
            'final_score':     float(final_score),
            'disaster_flag':   bool(disaster_flag),
            'executed':        bool(executed),
            'trade_won':       None,
            'pnl':             None,
            'exit_reason':     None,
            'signal_id':       len(self.signals),
        }
        self.signals.append(record)
        if executed:
            self.pending_trades[record['signal_id']] = record
        return record['signal_id']

    def update_trade_outcome(self, signal_id, won, pnl, exit_reason):
        if signal_id < len(self.signals):
            record              = self.signals[signal_id]
            record['trade_won'] = bool(won)
            record['pnl']       = float(pnl)
            record['exit_reason'] = exit_reason
            year = record['year']
            if year not in self.year_data:
                self.year_data[year] = []
            if record not in self.year_data[year]:
                self.year_data[year].append(record)
            self.pending_trades.pop(signal_id, None)

    def save_year_data(self, year):
        if year not in self.year_data:
            print(f"   ⚠️  No data for year {year}")
            return
        df       = pd.DataFrame(self.year_data[year])
        filepath = f"{self.output_dir}/year_{year}_live_data.csv"
        df.to_csv(filepath, index=False)
        trades  = len(df[df['executed'] == True])
        wins    = len(df[df['trade_won'] == True])
        win_rate = wins / trades * 100 if trades > 0 else 0
        print(f"   ✅ Saved {len(df)} signals for {year}  "
              f"({trades} trades | {wins} wins | {win_rate:.1f}%)")

    def save_all_data(self):
        if not self.signals:
            print("   ⚠️  No signals collected!")
            return
        df_all   = pd.DataFrame(self.signals)
        filepath = f"{self.output_dir}/complete_signals.csv"
        df_all.to_csv(filepath, index=False)
        print(f"\n📊 COMPLETE DATASET: {len(df_all)} signals → {filepath}")
        for year in sorted(self.year_data.keys()):
            self.save_year_data(year)


# ══════════════════════════════════════════════════════════════════════════════
#  3-LAYER SYSTEM — STRATEGY-AWARE
# ══════════════════════════════════════════════════════════════════════════════

class ThreeLayerTradingSystem:
    """
    Backtest orchestrator that delegates ALL signal evaluation to the
    active strategy object.

    The strategy is set at construction and can be changed between runs.
    The three layers (technical/sentiment/ML) are called here; the strategy
    only receives their scores and returns a decision.
    """

    def __init__(self, trading_bot, sentiment_analyzer, ml_predictor,
                 strategy_name: str = "sniper", collect_data: bool = False):
        self.bot       = trading_bot
        self.sentiment = sentiment_analyzer
        self.ml        = ml_predictor

        # Strategy
        self.strategy = StrategyFactory.create(strategy_name)

        # Data collection
        self.collect_data   = collect_data
        self.data_collector = LiveMLDataCollector() if collect_data else None

        # Tracking
        self.decisions     = []
        self.signal_to_trade = {}

        # Per-day counters for StrategyContext
        self._daily_losses   = 0
        self._daily_wins     = 0
        self._current_date: date | None = None

        print("\n" + "=" * 100)
        print(f"🚀 3-LAYER SYSTEM v5.2  |  Strategy: [{self.strategy.NAME.upper()}]".center(100))
        if collect_data:
            print("📊 DATA COLLECTION: ON (strategy-neutral Sniper thresholds)".center(100))
        print("=" * 100 + "\n")

    def _reset_daily_if_needed(self, current_date: date):
        """Reset per-day counters when the date rolls over."""
        if self._current_date != current_date:
            self._current_date = current_date
            self._daily_losses = 0
            self._daily_wins   = 0

    def _record_trade_result(self, trade: dict):
        """Update daily counters when a trade closes."""
        if trade.get('pnl', 0) > 0:
            self._daily_wins  += 1
        else:
            self._daily_losses += 1

    def _build_context(self, timestamp: datetime) -> StrategyContext:
        """Build StrategyContext from current bot state."""
        open_positions = len([t for t in self.bot.trades if t.get('status') == 'OPEN'])
        return StrategyContext(
            capital         = self.bot.capital,
            initial_capital = self.bot.initial_capital,
            peak_capital    = self.bot.peak_capital,
            daily_pnl       = self.bot.daily_pnl,
            daily_trades    = self.bot.daily_trades,
            daily_losses    = self._daily_losses,
            daily_wins      = self._daily_wins,
            open_positions  = open_positions,
            loss_streak     = self.bot.loss_streak,
            current_time    = timestamp,
        )

    def evaluate_trade(self, signal: dict, timestamp: datetime,
                       verbose: bool = True) -> tuple[bool, dict]:
        """
        Evaluate a signal using the active strategy.

        Returns (execute: bool, decision: dict) where decision includes
        all scores and metadata for logging.
        """
       # Layer 2: Sentiment — DISABLED in backtest (live news irrelevant to historical data)
        sentiment_data = {
    'sentiment_boost': 0.0,
    'disaster_flag': False,
    'sentiment_score': 0.0,
    'article_count': 0,
}
        # Layer 3: ML
        ml_data = self.ml.predict_trade_quality(signal['features'])

        # Strategy evaluation
        context  = self._build_context(timestamp)
        decision = self.strategy.evaluate(signal, sentiment_data, ml_data, context)

        execute = decision['execute']

        # Attach full decision to the returned dict (for logging)
        decision['timestamp'] = timestamp

        self.decisions.append(decision)

        # Data collection (Sniper-neutral — uses strategy output but records all)
        if self.collect_data and self.data_collector:
            signal_id = self.data_collector.record_signal(
                signal,
                decision['technical_score'],
                decision['sentiment_score'],
                decision['ml_score'],
                decision['final_score'],
                execute,
                decision['disaster_flag'],
                timestamp,
            )
            decision['signal_id'] = signal_id

        if verbose and (execute or len(self.decisions) % 50 == 0):
            mode = "[RISK-BLOCKED]" if decision['risk_blocked'] else ""
            print(
                f"Signal #{len(self.decisions)}: {signal['action']} @ ₹{signal['price']:.0f}"
                f" | Score: {decision['final_score']:.1f}/120"
                f" (ML:{decision['ml_score']:.0f})"
                f" | {decision['reason'][:60]}"
                f" {mode}"
            )

        return execute, decision

    def record_trade_outcome(self, trade: dict, signal_id: int):
        if not self.collect_data or not self.data_collector:
            return
        self.data_collector.update_trade_outcome(
            signal_id,
            trade['pnl'] > 0,
            trade['pnl'],
            trade.get('exit_reason', 'UNKNOWN'),
        )

    def get_statistics(self) -> dict:
        if not self.decisions:
            return {}
        total    = len(self.decisions)
        executed = sum(1 for d in self.decisions if d['execute'])
        blocked  = sum(1 for d in self.decisions if d.get('risk_blocked'))
        return {
            'total_signals':    total,
            'executed':         executed,
            'blocked':          blocked,
            'execution_rate':   executed / total * 100 if total > 0 else 0,
            'risk_block_rate':  blocked  / total * 100 if total > 0 else 0,
            'strategy':         self.strategy.NAME,
        }


# ══════════════════════════════════════════════════════════════════════════════
#  MASTER CONTROLLER v5.2
# ══════════════════════════════════════════════════════════════════════════════

class IntegrationController:
    """Master controller — handles all three operating modes."""

    def __init__(self, data_file="data/NIFTY_1MIN_2015_2025.csv"):
        self.data_file  = data_file
        self.output_dir = "3layer_results_v5"
        self.ml_data_dir = "3layer_ml_data"
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.ml_data_dir, exist_ok=True)

    # ── MODE 1: Collect ML training data ──────────────────────────────────────

    def collect_ml_data(self):
        """
        Run backtest WITHOUT trained ML to collect training data.
        Always uses Sniper strategy for data collection — ensures
        a consistent, strategy-neutral training set.
        """
        print("\n" + "=" * 100)
        print("MODE 1: COLLECTING ML TRAINING DATA".center(100))
        print("  (Always uses Sniper strategy — strategy-neutral training set)".center(100))
        print("=" * 100 + "\n")

        bot       = TradingBot(capital=100000)
        sentiment = SentimentAnalyzer()
        ml        = EnhancedMLTradePredictor()   # Untrained = neutral scores

        system = ThreeLayerTradingSystem(
            bot, sentiment, ml,
            strategy_name="sniper",
            collect_data=True,
        )

        df = self.load_full_data()
        if df is None:
            return
        df = bot.calculate_indicators(df)

        for year in sorted(df.index.year.unique()):
            print(f"\n{'╔' + '═'*98 + '╗'}")
            print(f"║ COLLECTING DATA: YEAR {year}".ljust(99) + "║")
            print(f"{'╚' + '═'*98 + '╝'}\n")
            year_data = df[df.index.year == year].copy()
            if len(year_data) < 100:
                print("⚠️  Skipping — insufficient data\n")
                continue
            system.bot.reset_state()
            system.decisions = []
            self._backtest_single_year_collect(system, year_data, year)
            system.data_collector.save_year_data(year)

        system.data_collector.save_all_data()
        print(f"\n{'='*100}")
        print("✅ DATA COLLECTION COMPLETE!".center(100))
        print(f"{'='*100}")
        print(f"\n   Next step: python integration.py --mode=train_ml")

    def _backtest_single_year_collect(self, system, df_year, year):
        signals_found   = 0
        trades_executed = 0

        for idx in range(100, len(df_year) - 5):
            timestamp = df_year.index[idx]
            price     = df_year['close'].iloc[idx]

            system._reset_daily_if_needed(timestamp.date())
            if system.bot.current_date != timestamp.date():
                system.bot.current_date = timestamp.date()
                system.bot.daily_trades = 0
                system.bot.daily_pnl    = 0

            hour = timestamp.hour
            if hour < 9 or hour > 15:
                continue
            if (hour == 9 and timestamp.minute < 30) or \
               (hour == 15 and timestamp.minute > 30):
                continue

            closed_trade = system.bot.update_trade(price, timestamp)
            if closed_trade:
                system._record_trade_result(closed_trade)
                for sid, tid in list(system.signal_to_trade.items()):
                    if tid == closed_trade['id']:
                        system.record_trade_outcome(closed_trade, sid)
                        del system.signal_to_trade[sid]
                        break

            if system.bot.daily_trades >= 8:
                continue
            if system.bot.daily_pnl < -system.bot.capital * 0.025:
                continue
            if len([t for t in system.bot.trades if t.get('status') == 'OPEN']) >= 2:
                continue

            signal = system.bot.generate_signal(df_year, idx)
            if signal:
                signals_found += 1
                execute, decision = system.evaluate_trade(
                    signal, timestamp, verbose=False
                )
                if execute:
                    position = system.bot.calculate_position_size(signal)
                    if position:
                        trade = system.bot.execute_trade(signal, position)
                        trades_executed += 1
                        if 'signal_id' in decision:
                            system.signal_to_trade[decision['signal_id']] = trade['id']

        # Close year-end positions
        if len(df_year) > 0:
            p = df_year['close'].iloc[-1]
            t = df_year.index[-1]
            for tr in [t for t in system.bot.trades if t.get('status') == 'OPEN']:
                closed = system.bot.close_trade(tr, p, t, 'YEAR_END')
                system._record_trade_result(closed)
                for sid, tid in list(system.signal_to_trade.items()):
                    if tid == closed['id']:
                        system.record_trade_outcome(closed, sid)
                        del system.signal_to_trade[sid]
                        break

        print(f"   Year {year}: {signals_found} signals → {trades_executed} executed")

    # ── MODE 2: Train ML model ─────────────────────────────────────────────────

    def train_ml_model(self):
        print("\n" + "=" * 100)
        print("MODE 2: TRAINING ML MODEL ON LIVE DATA".center(100))
        print("=" * 100 + "\n")

        ml_files = glob.glob(f"{self.ml_data_dir}/year_*_live_data.csv")
        if not ml_files:
            print(f"❌ No training data found in {self.ml_data_dir}/")
            print(f"   Run first: python integration.py --mode=collect_data")
            return

        total_executed = 0
        for f in sorted(ml_files):
            df           = pd.read_csv(f)
            exec_trades  = df[df['executed'] == True]
            total_executed += len(exec_trades)
            year = os.path.basename(f).split('_')[1]
            wins = len(exec_trades[exec_trades['trade_won'] == True])
            print(f"   Year {year}: {len(df):,} signals, "
                  f"{len(exec_trades)} trades, {wins} wins")

        if total_executed < 50:
            print(f"\n⚠️  Only {total_executed} executed trades — need ≥ 50 for training")
            return

        ml = EnhancedMLTradePredictor(
            model_path=f"{self.output_dir}/ml_model_v6.pkl"
        )
        success = ml.train_on_live_data(ml_files)
        if success:
            print(f"\n{'='*100}")
            print("✅ ML MODEL TRAINING COMPLETE".center(100))
            print(f"{'='*100}")
            print(f"\n   Next step: python integration.py --mode=full_backtest")

    # ── MODE 3: Full backtest ──────────────────────────────────────────────────

    def full_backtest(self, strategy_name: str = "sniper"):
        print("\n" + "=" * 100)
        print(
            f"MODE 3: FULL BACKTEST  |  STRATEGY: [{strategy_name.upper()}]".center(100)
        )
        print("=" * 100 + "\n")

        ml_model_path = f"{self.output_dir}/ml_model_v6.pkl"
        if not os.path.exists(ml_model_path):
            print("⚠️  ML model not found — Layer 3 will give neutral scores (20/40)")

        bot       = TradingBot(capital=100000)
        sentiment = SentimentAnalyzer()
        ml        = EnhancedMLTradePredictor(model_path=ml_model_path)
        system    = ThreeLayerTradingSystem(
            bot, sentiment, ml,
            strategy_name=strategy_name,
            collect_data=False,
        )

        log_file         = f"{self.output_dir}/backtest_{strategy_name}.txt"
        self.log_handle  = open(log_file, 'w', encoding='utf-8')
        self._write("=" * 120)
        self._write(
            f"3-LAYER TRADING SYSTEM v5.2  |  STRATEGY: {strategy_name.upper()}".center(120)
        )
        self._write(f"Started: {datetime.now():%Y-%m-%d %H:%M:%S}".center(120))
        self._write("=" * 120 + "\n")

        df = self.load_full_data()
        if df is None:
            self.log_handle.close()
            return
        df = bot.calculate_indicators(df)

        self._run_yearwise_backtest(system, df, strategy_name)

        self._write("\n" + "=" * 120)
        self._write(f"Completed: {datetime.now():%Y-%m-%d %H:%M:%S}".center(120))
        self._write("=" * 120)
        self.log_handle.close()
        print(f"\n📄 Log saved: {log_file}\n")

    def _run_yearwise_backtest(self, system, df, strategy_name):
        years           = sorted(df.index.year.unique())
        yearly_results  = []
        all_trades      = []

        for year in years:
            self._write(f"\n{'╔' + '═'*118 + '╗'}")
            self._write(f"║ YEAR {year}  |  Strategy: {strategy_name.upper()}".ljust(119) + "║")
            self._write(f"{'╚' + '═'*118 + '╝'}\n")

            year_data = df[df.index.year == year].copy()
            if len(year_data) < 100:
                self._write("⚠️  Skipping — insufficient data\n")
                continue

            system.bot.reset_state()
            system.decisions  = []
            system._daily_losses = 0
            system._daily_wins   = 0
            system._current_date = None

            stats, trades = self._backtest_single_year(system, year_data, year)
            yearly_results.append(stats)
            all_trades.extend(trades)

        self._print_final_summary(yearly_results, all_trades, strategy_name)

    def _backtest_single_year(self, system, df_year, year):
        trade_log     = []
        signal_count  = 0

        for idx in range(100, len(df_year) - 5):
            timestamp = df_year.index[idx]
            price     = df_year['close'].iloc[idx]

            system._reset_daily_if_needed(timestamp.date())
            if system.bot.current_date != timestamp.date():
                system.bot.current_date = timestamp.date()
                system.bot.daily_trades = 0
                system.bot.daily_pnl    = 0

            hour = timestamp.hour
            if hour < 9 or hour > 15:
                continue
            if (hour == 9 and timestamp.minute < 30) or \
               (hour == 15 and timestamp.minute > 30):
                continue

            closed_trade = system.bot.update_trade(price, timestamp)
            if closed_trade:
                system._record_trade_result(closed_trade)

            signal = system.bot.generate_signal(df_year, idx)
            if not signal:
                continue

            signal_count += 1
            execute, decision = system.evaluate_trade(
                signal, timestamp, verbose=False
            )

            # ── Log every signal ───────────────────────────────────────────
            self._write(f"\n{'─'*120}")
            self._write(
                f"SIGNAL #{signal_count} | {timestamp:%Y-%m-%d %H:%M}"
                f" | {signal['action']} @ ₹{signal['price']:.2f}"
            )
            self._write("─" * 120)
            self._write(
                f"Setup: {signal['setup']:30s}"
                f" | Regime: {signal.get('regime','?'):20s}"
                f" | R:R: 1:{signal['rr']:.1f}"
            )
            self._write(
                f"Entry: ₹{signal['price']:8.2f}"
                f" | Stop: ₹{signal['stop']:8.2f}"
                f" | Target: ₹{signal['target']:8.2f}"
            )
            self._write("")
            self._write("3-LAYER SCORING:")
            self._write(f"   Layer 1 (Technical): {decision['technical_score']:6.1f}/100")
            self._write(f"   Layer 2 (Sentiment): {decision['sentiment_score']:>+6.1f}/20")
            self._write(f"   Layer 3 (ML Model):  {decision['ml_score']:6.1f}/40")
            self._write(f"   {'─'*50}")
            self._write(f"   FINAL SCORE:         {decision['final_score']:6.1f}/120")
            self._write(f"   Strategy:            {decision['strategy_name'].upper()}")
            if decision['risk_blocked']:
                self._write(f"   ⛔ RISK-BLOCKED: {decision['reason']}")
            self._write("")

            if execute:
                position = system.bot.calculate_position_size(signal)
                if position:
                    # ML lot adjustment using strategy
                    ml_score = decision['ml_score']
                    context  = system._build_context(timestamp)
                    adj_lots = system.strategy.calculate_lot_size(ml_score, context)

                    risk_pts = abs(signal['price'] - signal['stop'])
                    adjusted_position = {
                        'lots':       max(1, int(adj_lots)),
                        'risk_pct':   max(1, int(adj_lots)) * risk_pts * system.bot.point_value / system.bot.capital,
                        'risk_amount': max(1, int(adj_lots)) * risk_pts * system.bot.point_value,
                    }

                    trade = system.bot.execute_trade(signal, adjusted_position)
                    trade['ml_score']  = ml_score
                    trade['lots_exact'] = adj_lots
                    trade['strategy']   = decision['strategy_name']
                    trade['decision']   = decision

                    self._write(
                        f"✅ EXECUTED: {adjusted_position['lots']} lot(s)"
                        f" | ML lots (exact): {adj_lots}"
                        f" | Risk: ₹{adjusted_position['risk_amount']:,.0f}"
                    )
            else:
                self._write(f"❌ SKIPPED: {decision['reason']}")

        # Year-end close
        if len(df_year) > 0:
            p = df_year['close'].iloc[-1]
            t = df_year.index[-1]
            for tr in [t for t in system.bot.trades if t.get('status') == 'OPEN']:
                system.bot.close_trade(tr, p, t, 'YEAR_END')

        # Year summary
        closed = [t for t in system.bot.trades if t.get('status') == 'CLOSED']
        wins   = [t for t in closed if t['pnl'] > 0]
        total_pnl  = sum(t['pnl'] for t in closed) if closed else 0
        return_pct = (system.bot.capital / system.bot.initial_capital - 1) * 100
        sys_stats  = system.get_statistics()

        self._write(f"\n{'─'*120}")
        self._write(f"YEAR {year} SUMMARY")
        self._write("─" * 120)
        self._write(
            f"Capital:    ₹{system.bot.initial_capital:>12,.0f}"
            f" → ₹{system.bot.capital:>12,.0f}"
        )
        self._write(f"P&L:        ₹{total_pnl:>+12,.0f}  ({return_pct:+.2f}%)")
        if closed:
            self._write(
                f"Trades:     {len(closed):>4} executed"
                f" | {len(wins):>4} wins"
                f" ({len(wins)/len(closed)*100:.1f}%)"
            )
        self._write(f"Signals:    {sys_stats.get('total_signals',0):>4} generated"
                    f" | {sys_stats.get('executed',0):>4} executed"
                    f" ({sys_stats.get('execution_rate',0):.1f}%)")
        self._write(f"Risk-blocks:{sys_stats.get('blocked',0):>4}"
                    f" ({sys_stats.get('risk_block_rate',0):.1f}%)")
        self._write(f"Max DD:     {system.bot.max_drawdown*100:>6.2f}%")
        self._write("─" * 120 + "\n")

        return {
            'year':           year,
            'return_pct':     return_pct,
            'trades':         len(closed),
            'wins':           len(wins),
            'win_rate':       len(wins)/len(closed)*100 if closed else 0,
            'signals':        sys_stats.get('total_signals', 0),
            'execution_rate': sys_stats.get('execution_rate', 0),
            'pnl':            total_pnl,
            'max_dd':         system.bot.max_drawdown,
        }, closed

    def _print_final_summary(self, yearly_results, all_trades, strategy_name):
        if not yearly_results:
            return
        self._write(f"\n\n{'╔' + '═'*118 + '╗'}")
        self._write(f"║ {'FINAL RESULTS — STRATEGY: ' + strategy_name.upper():^116} ║")
        self._write(f"{'╚' + '═'*118 + '╝'}\n")

        self._write(
            f"{'YEAR':<8} {'RETURN':>10} {'TRADES':>10} {'WIN%':>10}"
            f" {'SIGNALS':>12} {'EXEC%':>10} {'MAX DD%':>10}"
        )
        self._write("─" * 120)
        for r in yearly_results:
            self._write(
                f"{r['year']:<8} {r['return_pct']:>+9.2f}%"
                f" {r['trades']:>10} {r['win_rate']:>9.1f}%"
                f" {r['signals']:>12} {r['execution_rate']:>9.1f}%"
                f" {r.get('max_dd',0)*100:>9.2f}%"
            )
        self._write("─" * 120)

        avg_return  = np.mean([r['return_pct'] for r in yearly_results])
        total_trades = sum(r['trades'] for r in yearly_results)
        overall_wr  = np.mean([r['win_rate'] for r in yearly_results if r['trades'] > 0])
        max_dd      = max(r.get('max_dd', 0) for r in yearly_results)

        self._write(f"\n📈 OVERALL:")
        self._write(f"   Avg Annual Return:  {avg_return:>+8.2f}%")
        self._write(f"   Total Trades:       {total_trades:>8}")
        self._write(f"   Overall Win Rate:   {overall_wr:>8.2f}%")
        self._write(f"   Max Drawdown:       {max_dd*100:>8.2f}%")

        if all_trades:
            wins   = [t for t in all_trades if t['pnl'] > 0]
            losses = [t for t in all_trades if t['pnl'] <= 0]
            avg_w  = np.mean([t['pnl'] for t in wins])   if wins   else 0
            avg_l  = np.mean([t['pnl'] for t in losses]) if losses else 0
            pf     = (abs(sum(t['pnl'] for t in wins))
                      / abs(sum(t['pnl'] for t in losses))
                      if losses and sum(t['pnl'] for t in losses) != 0 else 0)
            self._write(f"\n📊 TRADE ANALYSIS:")
            self._write(f"   Avg Win:   ₹{avg_w:>+10,.0f}")
            self._write(f"   Avg Loss:  ₹{avg_l:>+10,.0f}")
            self._write(f"   W/L Ratio: {abs(avg_w/avg_l):.2f}:1" if avg_l != 0 else "   W/L Ratio: N/A")
            self._write(f"   Profit Factor: {pf:.2f}")

        self._write(f"\n{'='*120}")
        if avg_return >= 100:
            verdict = "🔥 EXCEPTIONAL performance!"
        elif avg_return >= 70:
            verdict = "✅ STRONG — strategy is working well."
        elif avg_return >= 40:
            verdict = "⚠️  MODERATE — profitable but room for improvement."
        else:
            verdict = "❌ UNDERPERFORMING — consider tuning parameters."
        self._write(verdict.center(120))
        self._write("=" * 120 + "\n")

    def _write(self, text: str):
        print(text)
        if hasattr(self, 'log_handle'):
            self.log_handle.write(text + "\n")
            self.log_handle.flush()

    # ── Data loading ───────────────────────────────────────────────────────────

    def load_full_data(self):
        try:
            print(f"📊 Loading data: {self.data_file}")
            df = pd.read_csv(self.data_file)
            dt_col = next(
                (c for c in df.columns
                 if any(x in str(c).lower() for x in ['date', 'time'])),
                None
            )
            if dt_col:
                df['datetime'] = pd.to_datetime(df[dt_col])
                df.set_index('datetime', inplace=True)
            col_map = {}
            for col in df.columns:
                cl = str(col).lower()
                if 'close' in cl: col_map[col] = 'close'
                elif 'open' in cl: col_map[col] = 'open'
                elif 'high' in cl: col_map[col] = 'high'
                elif 'low'  in cl: col_map[col] = 'low'
            df.rename(columns=col_map, inplace=True)
            for c in ['close', 'open', 'high', 'low']:
                if c not in df.columns:
                    df[c] = df.iloc[:, 0]
            df = df.loc['2015-01-01':'2026-01-30']
            df = df.resample('15min').agg(
                {'open': 'first', 'high': 'max', 'low': 'min', 'close': 'last'}
            ).dropna()
            print(f"✅ Loaded {len(df):,} bars ({df.index[0].date()} → {df.index[-1].date()})")
            return df
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            return None


# ══════════════════════════════════════════════════════════════════════════════
#  INTERACTIVE STRATEGY SELECTOR
# ══════════════════════════════════════════════════════════════════════════════

def _prompt_strategy_selection() -> str:
    """
    Interactive CLI prompt for strategy selection.
    Returns the selected strategy name as a string.
    Defaults to 'sniper' if user presses Enter without input.
    """
    available = StrategyFactory.available()
    print("\n" + "═" * 60)
    print("  📊 STRATEGY SELECTION FOR BACKTEST")
    print("═" * 60)
    for i, name in enumerate(available, 1):
        descriptions = {
            "sniper":       "Ultra-precise | 5-star setups only",
            "balanced":     "Standard approach | Equal trend/reversion",
            "aggressive":   "High frequency | Auto-degrades on drawdown",
            "conservative": "Maximum protection | Time-window + loss lockout",
        }
        print(f"  [{i}] {name:<15}  {descriptions.get(name, '')}")
    print("═" * 60)

    while True:
        raw = input(
            f"\n  Enter strategy name or number "
            f"[default: sniper]: "
        ).strip()

        if not raw:
            print("  → Defaulting to SNIPER")
            return "sniper"

        # Number selection
        if raw.isdigit():
            idx = int(raw) - 1
            if 0 <= idx < len(available):
                selected = available[idx]
                print(f"  → Selected: {selected.upper()}")
                return selected
            else:
                print(f"  ⚠️  Invalid number. Choose 1–{len(available)}")
                continue

        # Name selection
        if StrategyFactory.is_valid(raw):
            print(f"  → Selected: {raw.upper()}")
            return raw.lower()

        print(f"  ⚠️  Unknown strategy '{raw}'. Options: {available}")


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description='3-Layer Trading System v5.2 — Multi-Strategy',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
WORKFLOW:
  Step 1: python integration.py --mode=collect_data
  Step 2: python integration.py --mode=train_ml
  Step 3: python integration.py --mode=full_backtest [--strategy=balanced]

STRATEGIES: {StrategyFactory.available()}
  If --strategy is omitted during full_backtest, you will be prompted interactively.
        """
    )
    parser.add_argument(
        '--mode',
        type=str,
        default='full_backtest',
        choices=['collect_data', 'train_ml', 'full_backtest'],
    )
    parser.add_argument(
        '--strategy',
        type=str,
        default=None,
        choices=StrategyFactory.available(),
        help='Strategy for full_backtest (omit for interactive selection)',
    )
    parser.add_argument(
        '--data',
        type=str,
        default='data/NIFTY_1MIN_2015_2025.csv',
    )

    args       = parser.parse_args()
    controller = IntegrationController(data_file=args.data)

    if args.mode == 'collect_data':
        controller.collect_ml_data()

    elif args.mode == 'train_ml':
        controller.train_ml_model()

    elif args.mode == 'full_backtest':
        if args.strategy:
            strategy_name = args.strategy
        else:
            strategy_name = _prompt_strategy_selection()
        controller.full_backtest(strategy_name=strategy_name)

    else:
        print(f"❌ Unknown mode: {args.mode}")
        parser.print_help()


if __name__ == "__main__":
    main()