#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  🚀 3-LAYER TRADING SYSTEM v5.1 - WITH ML-BASED LOT SIZING                   ║
║  File: integration_v5_enhanced.py                                             ║
║                                                                                ║
║  ENHANCED: Dynamic position sizing based on ML confidence                    ║
║                                                                                ║
║  NEW FEATURES:                                                                 ║
║  - ML Score < 15  → 0.5x lots (Reduce risk on weak predictions)             ║
║  - ML Score < 22  → 0.75x lots (Moderate reduction)                          ║
║  - ML Score >= 22 → 1.25x lots (Increase on strong predictions)             ║
║  - Detailed ML performance tracking by score bucket                          ║
║  - Enhanced trade logging with lot adjustment details                        ║
║                                                                                ║
║  WORKFLOW:                                                                     ║
║  1. python integration_v5_enhanced.py --mode=collect_data                    ║
║  2. python integration_v5_enhanced.py --mode=train_ml                        ║
║  3. python integration_v5_enhanced.py --mode=full_backtest                   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime
import argparse
import glob
import json

# Import all 3 layers
from layer1_trading_bot import TradingBot
from layer2_sentiment import SentimentAnalyzer
from layer3_ml_model import EnhancedMLTradePredictor

print("""
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                🚀 3-LAYER SMART TRADING SYSTEM v5.1                           ║
║                  WITH ML-BASED DYNAMIC LOT SIZING                             ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
""")


# ═══════════════════════════════════════════════════════════════════════════════
#                    LIVE ML DATA COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class LiveMLDataCollector:
    """
    Collects ML training data in real-time during backtesting
    
    Records EVERY signal (executed + skipped) with:
    - All features at signal time
    - 3-layer scores
    - Actual trade outcome (win/loss)
    """
    
    def __init__(self, output_dir="3layer_ml_data"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        self.signals = []  # All signals
        self.pending_trades = {}  # Waiting for outcome
        self.year_data = {}  # Per-year storage
        
        print(f"📊 Live ML Data Collector initialized")
        print(f"   Output: {output_dir}/")
    
    
    def record_signal(self, signal, technical_score, sentiment_score, ml_score,
                     final_score, executed, disaster_flag, timestamp):
        """Record a signal with all context"""
        
        features = signal.get('features', {})
        
        record = {
            # Timestamp
            'timestamp': str(timestamp),
            'year': timestamp.year,
            'month': timestamp.month,
            'day': timestamp.day,
            'hour': timestamp.hour,
            'minute': timestamp.minute,
            'day_of_week': timestamp.dayofweek,
            
            # Signal details
            'action': signal['action'],
            'price': float(signal['price']),
            'stop': float(signal['stop']),
            'target': float(signal['target']),
            'rr': float(signal.get('rr', 0)),
            'setup': signal.get('setup', 'unknown'),
            'regime': signal.get('regime', 'unknown'),
            
            # ALL FEATURES (32 features)
            'close': float(features.get('close', 0)),
            'atr_pct': float(features.get('atr_pct', 0)),
            'rsi': float(features.get('rsi', 50)),
            'adx': float(features.get('adx', 25)),
            'macd': float(features.get('macd', 0)),
            'macd_hist': float(features.get('macd_hist', 0)),
            'bb_position': float(features.get('bb_position', 0.5)),
            'bb_width': float(features.get('bb_width', 0)),
            'mom10': float(features.get('mom10', 0)),
            'mom20': float(features.get('mom20', 0)),
            'dist_ema9': float(features.get('dist_ema9', 0)),
            'dist_ema21': float(features.get('dist_ema21', 0)),
            'dist_ema50': float(features.get('dist_ema50', 0)),
            'trend_up': int(features.get('trend_up', 0)),
            'trend_down': int(features.get('trend_down', 0)),
            'drawdown_pct': float(features.get('drawdown_pct', 0)),
            'daily_trades': int(features.get('daily_trades', 0)),
            'portfolio_heat': float(features.get('portfolio_heat', 0)),
            'win_streak': int(features.get('win_streak', 0)),
            'loss_streak': int(features.get('loss_streak', 0)),
            'recent_win_rate': float(features.get('recent_win_rate', 0.5)),
            
            # 3-Layer Scores
            'technical_score': float(technical_score),
            'sentiment_score': float(sentiment_score),
            'ml_score': float(ml_score),
            'final_score': float(final_score),
            
            # Decision
            'disaster_flag': bool(disaster_flag),
            'executed': bool(executed),
            
            # Outcome (filled later)
            'trade_won': None,  # Will be True/False after trade closes
            'pnl': None,
            'exit_reason': None,
            'signal_id': len(self.signals)  # Unique ID
        }
        
        self.signals.append(record)
        
        # If executed, track it
        if executed:
            self.pending_trades[record['signal_id']] = record
        
        return record['signal_id']
    
    
    def update_trade_outcome(self, signal_id, won, pnl, exit_reason):
        """Update outcome when trade closes"""
        # Find the signal in all signals
        if signal_id < len(self.signals):
            record = self.signals[signal_id]
            record['trade_won'] = bool(won)
            record['pnl'] = float(pnl)
            record['exit_reason'] = exit_reason
            
            # Add to year data
            year = record['year']
            if year not in self.year_data:
                self.year_data[year] = []
            
            # Only add if not already there
            if record not in self.year_data[year]:
                self.year_data[year].append(record)
            
            # Remove from pending
            if signal_id in self.pending_trades:
                del self.pending_trades[signal_id]
    
    
    def save_year_data(self, year):
        """Save collected data for a year"""
        if year not in self.year_data:
            print(f"   ⚠️  No data for year {year}")
            return
        
        # Convert to DataFrame
        df = pd.DataFrame(self.year_data[year])
        
        # Save CSV
        filepath = f"{self.output_dir}/year_{year}_live_data.csv"
        df.to_csv(filepath, index=False)
        
        trades = len(df[df['executed'] == True])
        wins = len(df[df['trade_won'] == True])
        win_rate = wins / trades * 100 if trades > 0 else 0
        
        print(f"   ✅ Saved {len(df)} signals for year {year}")
        print(f"      Executed: {trades} | Wins: {wins} ({win_rate:.1f}%)")
        print(f"      File: {filepath}")
    
    
    def save_all_data(self):
        """Save all collected data"""
        if not self.signals:
            print("   ⚠️  No signals collected!")
            return
        
        # Save complete dataset
        df_all = pd.DataFrame(self.signals)
        filepath = f"{self.output_dir}/complete_signals.csv"
        df_all.to_csv(filepath, index=False)
        
        print(f"\n📊 SAVED COMPLETE DATASET:")
        print(f"   Total signals: {len(df_all)}")
        print(f"   Executed: {len(df_all[df_all['executed'] == True])}")
        print(f"   File: {filepath}")
        
        # Save per-year files
        for year in sorted(self.year_data.keys()):
            self.save_year_data(year)


# ═══════════════════════════════════════════════════════════════════════════════
#                    3-LAYER SYSTEM WITH ML-BASED LOT SIZING
# ═══════════════════════════════════════════════════════════════════════════════

class ThreeLayerTradingSystem:
    """
    Enhanced 3-Layer system with ML-based dynamic lot sizing
    """
    
    def __init__(self, trading_bot, sentiment_analyzer, ml_predictor, collect_data=False):
        self.bot = trading_bot
        self.sentiment = sentiment_analyzer
        self.ml = ml_predictor
        
        # Data collection
        self.collect_data = collect_data
        if collect_data:
            self.data_collector = LiveMLDataCollector()
        else:
            self.data_collector = None
        
        # Thresholds
        self.MIN_SCORE = 60
        self.DISASTER_BLOCKS = True
        
        # 🔥 NEW: ML-based lot sizing thresholds
        self.ML_WEAK_THRESHOLD = 15      # Below this = 0.5x lots
        self.ML_MEDIUM_THRESHOLD = 22    # Below this = 0.75x lots
        self.ML_WEAK_MULTIPLIER = 0.5
        self.ML_MEDIUM_MULTIPLIER = 0.75
        self.ML_STRONG_MULTIPLIER = 1.25
        
        # Tracking
        self.decisions = []
        self.signal_to_trade = {}  # Map signal_id to trade_id
        
        print("\n" + "="*100)
        print("🚀 3-LAYER SYSTEM v5.1 INITIALIZED".center(100))
        if collect_data:
            print("📊 DATA COLLECTION: ON".center(100))
        print("🎯 ML-BASED DYNAMIC LOT SIZING: ENABLED".center(100))
        print("="*100 + "\n")
    
    
    def evaluate_trade(self, signal, verbose=True):
        """
        🔥 ENHANCED: Evaluate trade with ML-aware scoring
        """
        # Layer 1: Technical
        technical_score = signal['technical_score']
        
        # Layer 2: Sentiment
        sentiment_data = self.sentiment.get_sentiment_score()
        sentiment_score = sentiment_data['sentiment_boost']
        disaster_flag = sentiment_data['disaster_flag']
        
        # Layer 3: ML
        ml_data = self.ml.predict_trade_quality(signal['features'])
        ml_score = ml_data['ml_score']
        
        # Final score
        final_score = technical_score + sentiment_score + ml_score
        
        # Decision
        execute = False
        reason = []
        
        # 🔥 NEW: Block only ML < 15 (very weak)
        if ml_score < 15:
            execute = False
            reason.append(f"❌ ML too weak ({ml_score:.0f}/40)")
        elif disaster_flag and self.DISASTER_BLOCKS:
            execute = False
            reason.append("🚨 DISASTER")
        elif final_score >= self.MIN_SCORE:
            execute = True
            if ml_score >= 22:
                reason.append(f"🔥 Strong ML: {ml_score:.0f}")
            else:
                reason.append(f"✅ Medium ML: {ml_score:.0f}")
        else:
            execute = False
            reason.append(f"❌ Score {final_score:.1f}")
        # Build decision - 🔥 INCLUDE ML SCORE
        decision = {
            'signal': signal,
            'technical_score': technical_score,
            'sentiment_score': sentiment_score,
            'ml_score': ml_score,  # <-- Essential for lot sizing!
            'final_score': final_score,
            'disaster_flag': disaster_flag,
            'execute': execute,
            'reason': ' | '.join(reason),
            'timestamp': signal['timestamp']
        }
        
        self.decisions.append(decision)
        
        # Collect data (if enabled)
        if self.collect_data and self.data_collector:
            signal_id = self.data_collector.record_signal(
                signal, technical_score, sentiment_score, ml_score,
                final_score, execute, disaster_flag, signal['timestamp']
            )
            decision['signal_id'] = signal_id
        
        # Print (optional)
        if verbose and (execute or len(self.decisions) % 50 == 0):
            print(f"Signal #{len(self.decisions)}: {signal['action']} @ ₹{signal['price']:.0f} | "
                  f"Score: {final_score:.1f}/160 (ML:{ml_score:.0f}) | {reason[0]}")
        
        return execute, decision
    
    
    def calculate_ml_adjusted_position(self, signal, ml_score):
        """
        🔥 NEW: Calculate position size with ML-based adjustment
        
        This wraps the bot's position sizing with ML multiplier logic
        """
        # Get base position from bot
        base_position = self.bot.calculate_position_size(signal)
        
        if base_position is None:
            return None
        
        # Apply ML-based multiplier
        original_lots = base_position['lots']
        
        if ml_score < self.ML_WEAK_THRESHOLD:
            lot_multiplier = self.ML_WEAK_MULTIPLIER
            confidence_label = "WEAK"
        elif ml_score < self.ML_MEDIUM_THRESHOLD:
            lot_multiplier = self.ML_MEDIUM_MULTIPLIER
            confidence_label = "MEDIUM"
        else:
            lot_multiplier = self.ML_STRONG_MULTIPLIER
            confidence_label = "STRONG"
        
        # Adjust lots (ensure minimum 1)
        adjusted_lots = max(1, int(original_lots * lot_multiplier))
        
        # Recalculate risk with adjusted lots
        risk_pts = abs(signal['price'] - signal['stop'])
        adjusted_position = {
            'lots': adjusted_lots,
            'risk_pct': adjusted_lots * risk_pts * self.bot.point_value / self.bot.capital,
            'risk_amount': adjusted_lots * risk_pts * self.bot.point_value,
            'ml_score': ml_score,
            'ml_adjusted': True,
            'original_lots': original_lots,
            'lot_multiplier': lot_multiplier,
            'ml_confidence': confidence_label
        }
        
        return adjusted_position
    
    
    def record_trade_outcome(self, trade, signal_id):
        """Record trade outcome for ML training"""
        if not self.collect_data or not self.data_collector:
            return
        
        won = trade['pnl'] > 0
        pnl = trade['pnl']
        exit_reason = trade.get('exit_reason', 'UNKNOWN')
        
        self.data_collector.update_trade_outcome(signal_id, won, pnl, exit_reason)
    
    
    def get_statistics(self):
        """Get stats"""
        if not self.decisions:
            return {}
        
        total = len(self.decisions)
        executed = sum(1 for d in self.decisions if d['execute'])
        blocked = total - executed
        
        return {
            'total_signals': total,
            'executed': executed,
            'blocked': blocked,
            'execution_rate': executed/total*100 if total > 0 else 0
        }


# ═══════════════════════════════════════════════════════════════════════════════
#                    MASTER CONTROLLER v5.1
# ═══════════════════════════════════════════════════════════════════════════════

class IntegrationController:
    """Master controller with ML-based lot sizing"""
    
    def __init__(self, data_file="data/NIFTY_1MIN_2015_2025.csv"):
        self.data_file = data_file
        self.output_dir = "3layer_results_v5"
        self.ml_data_dir = "3layer_ml_data"
        
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.ml_data_dir, exist_ok=True)
    
    
    # ═══════════════════════════════════════════════════════════════════════
    #            MODE 1: COLLECT ML TRAINING DATA
    # ═══════════════════════════════════════════════════════════════════════
    
    def collect_ml_data(self):
        """Run backtest WITHOUT ML to collect training data"""
        print("\n" + "="*100)
        print("MODE 1: COLLECTING ML TRAINING DATA".center(100))
        print("="*100 + "\n")
        
        print("This will run a full backtest WITHOUT ML predictions to generate training data.")
        print("The ML layer will give neutral scores (20/40) during data collection.\n")
        
        # Initialize layers (no ML model needed yet)
        bot = TradingBot(capital=100000)
        sentiment = SentimentAnalyzer()
        ml = EnhancedMLTradePredictor()  # Untrained = neutral scores
        
        # Create system with DATA COLLECTION ON
        system = ThreeLayerTradingSystem(bot, sentiment, ml, collect_data=True)
        
        # Load data
        df = self.load_full_data()
        if df is None:
            return
        
        df = bot.calculate_indicators(df)
        
        # Run backtest year by year
        years = sorted(df.index.year.unique())
        
        for year in years:
            print(f"\n{'╔'+'═'*98+'╗'}")
            print(f"║ COLLECTING DATA: YEAR {year}".ljust(99) + "║")
            print(f"{'╚'+'═'*98+'╝'}\n")
            
            year_data = df[df.index.year == year].copy()
            
            if len(year_data) < 100:
                print(f"⚠️  Skipping - insufficient data\n")
                continue
            
            # Reset
            system.bot.reset_state()
            system.decisions = []
            
            # Run year
            self.backtest_single_year_collect(system, year_data, year)
            
            # Save year data
            system.data_collector.save_year_data(year)
        
        # Save complete dataset
        system.data_collector.save_all_data()
        
        print(f"\n{'='*100}")
        print(f"✅ DATA COLLECTION COMPLETE!".center(100))
        print(f"{'='*100}")
        print(f"\n   Next step: python integration_v5_enhanced.py --mode=train_ml")
        print(f"{'='*100}\n")
    
    
    def backtest_single_year_collect(self, system, df_year, year):
        """Backtest single year with data collection"""
        
        signals_found = 0
        trades_executed = 0
        
        for idx in range(100, len(df_year) - 5):
            timestamp = df_year.index[idx]
            price = df_year['close'].iloc[idx]
            
            # Daily reset
            if system.bot.current_date != timestamp.date():
                system.bot.current_date = timestamp.date()
                system.bot.daily_trades = 0
                system.bot.daily_pnl = 0
            
            # Trading hours
            hour = timestamp.hour
            if hour < 9 or hour > 15:
                continue
            if (hour == 9 and timestamp.minute < 30) or (hour == 15 and timestamp.minute > 30):
                continue
            
            # Update trades and record outcomes
            closed_trade = system.bot.update_trade(price, timestamp)
            if closed_trade:
                # Find signal_id for this trade
                for signal_id, trade_id in list(system.signal_to_trade.items()):
                    if trade_id == closed_trade['id']:
                        # Record outcome
                        system.record_trade_outcome(closed_trade, signal_id)
                        del system.signal_to_trade[signal_id]
                        break
            
            # Check limits
            if system.bot.daily_trades >= 8:
                continue
            if system.bot.daily_pnl < -system.bot.capital * 0.025:
                continue
            
            open_count = len([t for t in system.bot.trades if t.get('status') == 'OPEN'])
            if open_count >= 2:
                continue
            
            # Generate signal
            signal = system.bot.generate_signal(df_year, idx)
            
            if signal:
                signals_found += 1
                
                # Evaluate with 3 layers + collect data
                execute, decision = system.evaluate_trade(signal, verbose=False)
                
                if execute:
                    # Execute trade (standard position sizing during data collection)
                    position = system.bot.calculate_position_size(signal)
                    
                    if position:
                        trade = system.bot.execute_trade(signal, position)
                        trades_executed += 1
                        
                        # Link signal_id to trade
                        if 'signal_id' in decision:
                            system.signal_to_trade[decision['signal_id']] = trade['id']
        
        # Close all trades at year end
        if len(df_year) > 0:
            price = df_year['close'].iloc[-1]
            timestamp = df_year.index[-1]
            
            for t in [t for t in system.bot.trades if t.get('status') == 'OPEN']:
                closed_trade = system.bot.close_trade(t, price, timestamp, 'YEAR_END')
                
                # Find signal_id for this trade
                for signal_id, trade_id in list(system.signal_to_trade.items()):
                    if trade_id == closed_trade['id']:
                        system.record_trade_outcome(closed_trade, signal_id)
                        del system.signal_to_trade[signal_id]
                        break
        
        # Stats
        print(f"   Year {year}: {signals_found} signals → {trades_executed} executed")
    
    
    # ═══════════════════════════════════════════════════════════════════════
    #            MODE 2: TRAIN ML ON COLLECTED DATA
    # ═══════════════════════════════════════════════════════════════════════
    
    def train_ml_model(self):
        """Train ML model on collected live data"""
        print("\n" + "="*100)
        print("MODE 2: TRAINING ML MODEL ON LIVE DATA".center(100))
        print("="*100 + "\n")
        
        # Find live data files
        ml_files = glob.glob(f"{self.ml_data_dir}/year_*_live_data.csv")
        
        if not ml_files:
            print(f"❌ No training data found!")
            print(f"   Expected location: {self.ml_data_dir}/year_XXXX_live_data.csv")
            print(f"\n   First run: python integration_v5_enhanced.py --mode=collect_data")
            return
        
        print(f"Found {len(ml_files)} years of training data:")
        
        total_signals = 0
        total_executed = 0
        total_wins = 0
        
        for f in sorted(ml_files):
            year = os.path.basename(f).split('_')[1]
            df = pd.read_csv(f)
            
            executed_trades = df[df['executed'] == True]
            wins = len(executed_trades[executed_trades['trade_won'] == True])
            
            total_signals += len(df)
            total_executed += len(executed_trades)
            total_wins += wins
            
            print(f"   Year {year}: {len(df):,} signals, {len(executed_trades)} trades, {wins} wins")
        
        if total_executed < 50:
            print(f"\n⚠️  WARNING: Only {total_executed} executed trades found!")
            print(f"   ML training requires at least 50-100 trades for good results.")
            return
        
        print(f"\n   TOTAL: {total_signals} signals, {total_executed} trades, {total_wins} wins")
        print()
        
        # Train model
        ml = EnhancedMLTradePredictor(model_path=f"{self.output_dir}/ml_model_v6.pkl")
        
        # Train on live data
        success = ml.train_on_live_data(ml_files)
        
        if success:
            print(f"\n{'='*100}")
            print(f"✅ ML MODEL v6.0 TRAINING COMPLETE")
            print(f"{'='*100}")
            print(f"   Model saved to: {self.output_dir}/ml_model_v6.pkl")
            print(f"\n   Next step: python integration_v5_enhanced.py --mode=full_backtest")
            print(f"{'='*100}\n")
        else:
            print(f"\n❌ Training failed.")
    
    
    # ═══════════════════════════════════════════════════════════════════════
    #            MODE 3: FULL BACKTEST WITH ML-BASED LOT SIZING
    # ═══════════════════════════════════════════════════════════════════════
    
    def full_backtest(self):
        """
        🔥 ENHANCED: Run full backtest with ML-based dynamic lot sizing
        """
        print("\n" + "="*100)
        print("MODE 3: FULL BACKTEST WITH ML-BASED LOT SIZING".center(100))
        print("="*100 + "\n")
        
        # Check ML model
        ml_model_path = f"{self.output_dir}/ml_model_v6.pkl"
        if not os.path.exists(ml_model_path):
            print("⚠️  ML model v6.0 not found!")
            print("   Running without ML layer (Layer 3 will give neutral scores)")
            print()
        
        # Initialize layers
        bot = TradingBot(capital=100000)
        sentiment = SentimentAnalyzer()
        ml = EnhancedMLTradePredictor(model_path=ml_model_path)
        
        # Create system (no data collection in final run)
        system = ThreeLayerTradingSystem(bot, sentiment, ml, collect_data=False)
        
        # Open detailed log file
        log_file = f"{self.output_dir}/detailed_backtest_log.txt"
        self.log_handle = open(log_file, 'w', encoding='utf-8')
        
        self.write_log("="*120)
        self.write_log("3-LAYER TRADING SYSTEM v5.1 - WITH ML-BASED LOT SIZING".center(120))
        self.write_log(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}".center(120))
        self.write_log("="*120 + "\n")
        
        # Load data
        df = self.load_full_data()
        if df is None:
            return
        
        df = bot.calculate_indicators(df)
        
        # Run backtest
        self.run_yearwise_backtest_detailed(system, df)
        
        self.write_log("\n" + "="*120)
        self.write_log(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}".center(120))
        self.write_log("="*120)
        
        self.log_handle.close()
        print(f"\n📄 Detailed log saved to: {log_file}\n")
    
    
    def write_log(self, text):
        """Write to both console and log file"""
        print(text)
        if hasattr(self, 'log_handle'):
            self.log_handle.write(text + "\n")
            self.log_handle.flush()
    
    
    def run_yearwise_backtest_detailed(self, system, df):
        """Run year-by-year backtest with detailed logging"""
        self.write_log(f"\n{'='*120}")
        self.write_log(f"RUNNING YEAR-BY-YEAR BACKTEST WITH ML-BASED LOT SIZING".center(120))
        self.write_log(f"{'='*120}\n")
        
        years = sorted(df.index.year.unique())
        yearly_results = []
        all_trades = []
        
        for year in years:
            self.write_log(f"\n{'╔'+'═'*118+'╗'}")
            self.write_log(f"║ YEAR {year}".ljust(119) + "║")
            self.write_log(f"{'╚'+'═'*118+'╝'}\n")
            
            year_data = df[df.index.year == year].copy()
            
            if len(year_data) < 100:
                self.write_log(f"⚠️  Skipping - insufficient data\n")
                continue
            
            system.bot.reset_state()
            system.decisions = []
            
            year_stats, year_trades = self.backtest_single_year_detailed(system, year_data, year)
            yearly_results.append(year_stats)
            all_trades.extend(year_trades)
        
        self.print_final_summary(yearly_results, all_trades)
    
    
    def backtest_single_year_detailed(self, system, df_year, year):
        """
        🔥 ENHANCED: Backtest with ML-adjusted position sizing
        """
        trade_log = []
        signal_count = 0
        
        for idx in range(100, len(df_year) - 5):
            timestamp = df_year.index[idx]
            price = df_year['close'].iloc[idx]
            
            if system.bot.current_date != timestamp.date():
                system.bot.current_date = timestamp.date()
                system.bot.daily_trades = 0
                system.bot.daily_pnl = 0
            
            hour = timestamp.hour
            if hour < 9 or hour > 15:
                continue
            if (hour == 9 and timestamp.minute < 30) or (hour == 15 and timestamp.minute > 30):
                continue
            
            system.bot.update_trade(price, timestamp)
            
            if system.bot.daily_trades >= 8:
                continue
            if system.bot.daily_pnl < -system.bot.capital * 0.025:
                continue
            
            open_count = len([t for t in system.bot.trades if t.get('status') == 'OPEN'])
            if open_count >= 2:
                continue
            
            signal = system.bot.generate_signal(df_year, idx)
            
            if signal:
                signal_count += 1
                execute, decision = system.evaluate_trade(signal, verbose=False)
                
                # Log every signal
                self.write_log(f"\n{'─'*120}")
                self.write_log(f"SIGNAL #{signal_count} | {timestamp.strftime('%Y-%m-%d %H:%M')} | {signal['action']} @ ₹{signal['price']:.2f}")
                self.write_log(f"{'─'*120}")
                self.write_log(f"Setup: {signal['setup']:30s} | Regime: {signal['regime']:20s} | R:R: 1:{signal['rr']:.1f}")
                self.write_log(f"Entry: ₹{signal['price']:8.2f} | Stop: ₹{signal['stop']:8.2f} | Target: ₹{signal['target']:8.2f}")
                self.write_log(f"")
                self.write_log(f"3-LAYER SCORING:")
                self.write_log(f"   Layer 1 (Technical):  {decision['technical_score']:6.1f}/100")
                self.write_log(f"   Layer 2 (Sentiment):  {decision['sentiment_score']:>+6.1f}/20")
                self.write_log(f"   Layer 3 (ML Model):   {decision['ml_score']:6.1f}/40")
                self.write_log(f"   {'─'*116}")
                self.write_log(f"   FINAL SCORE:          {decision['final_score']:6.1f}/160 ({decision['final_score']/160*100:5.1f}%)")
                self.write_log(f"")
                
                if execute:
                    # 🔥 NEW: Use ML-adjusted position sizing
                    ml_score = decision['ml_score']
                    position = system.calculate_ml_adjusted_position(signal, ml_score)
                    
                    if position:
                        trade = system.bot.execute_trade(signal, position)
                        
                        # 🔥 Store ML info in trade
                        trade['ml_score'] = ml_score
                        trade['ml_adjusted'] = position.get('ml_adjusted', False)
                        trade['original_lots'] = position.get('original_lots', position['lots'])
                        trade['lot_multiplier'] = position.get('lot_multiplier', 1.0)
                        
                        # Enhanced logging
                        if position.get('ml_adjusted'):
                            self.write_log(f"✅ EXECUTED: {position['lots']} lots (ML-adjusted from {position['original_lots']} @ {position['lot_multiplier']}x)")
                            self.write_log(f"   ML Confidence: {position['ml_confidence']} | Risk: ₹{position['risk_amount']:,.0f} ({position['risk_pct']*100:.2f}%)")
                        else:
                            self.write_log(f"✅ EXECUTED: {position['lots']} lots | Risk: ₹{position['risk_amount']:,.0f} ({position['risk_pct']*100:.2f}%)")
                        
                        trade['signal_num'] = signal_count
                        trade['entry_time'] = timestamp
                        trade['decision'] = decision
                else:
                    self.write_log(f"❌ SKIPPED: {decision['reason']}")
        
        # Close all at year end
        if len(df_year) > 0:
            price = df_year['close'].iloc[-1]
            timestamp = df_year.index[-1]
            for t in [t for t in system.bot.trades if t.get('status') == 'OPEN']:
                system.bot.close_trade(t, price, timestamp, 'YEAR_END')
        
        # Log completed trades
        closed_trades = [t for t in system.bot.trades if t.get('status') == 'CLOSED']
        
        if closed_trades:
            self.write_log(f"\n\n{'╔'+'═'*118+'╗'}")
            self.write_log(f"║ YEAR {year} - TRADE OUTCOMES ({len(closed_trades)} trades)".ljust(119) + "║")
            self.write_log(f"{'╚'+'═'*118+'╝'}\n")
            
            for i, t in enumerate(closed_trades, 1):
                won = t['pnl'] > 0
                self.write_log(f"Trade #{i:3d} | {'✅ WIN' if won else '❌ LOSS'}")
                self.write_log(f"   Entry:  {t['time'].strftime('%Y-%m-%d %H:%M')} @ ₹{t['price']:8.2f} | {t['action']:4s} {t['lots']}L")
                self.write_log(f"   Exit:   {t['exit_time'].strftime('%Y-%m-%d %H:%M')} @ ₹{t['exit_price']:8.2f} | {t['exit_reason']}")
                self.write_log(f"   P&L:    ₹{t['pnl']:>+10,.0f} | Setup: {t.get('setup', 'N/A')}")
                
                if 'decision' in t:
                    self.write_log(f"   Score:  {t['decision']['final_score']:.1f}/160 (Tech:{t['decision']['technical_score']:.0f} Sent:{t['decision']['sentiment_score']:+.0f} ML:{t['decision']['ml_score']:.0f})")
                
                # 🔥 NEW: Show ML lot adjustment
                if t.get('ml_adjusted'):
                    self.write_log(f"   Lots:   {t['lots']} (ML-adjusted from {t.get('original_lots', t['lots'])} @ {t.get('lot_multiplier', 1.0)}x)")
                
                self.write_log("")
        
        # Stats
        wins = [t for t in closed_trades if t['pnl'] > 0]
        total_pnl = sum(t['pnl'] for t in closed_trades) if closed_trades else 0
        return_pct = (system.bot.capital / system.bot.initial_capital - 1) * 100
        
        sys_stats = system.get_statistics()
        
        self.write_log(f"\n{'─'*120}")
        self.write_log(f"YEAR {year} SUMMARY")
        self.write_log(f"{'─'*120}")
        self.write_log(f"Capital:          ₹{system.bot.initial_capital:>12,.0f} → ₹{system.bot.capital:>12,.0f}")
        self.write_log(f"P&L:              ₹{total_pnl:>+12,.0f} ({return_pct:+.2f}%)")
        self.write_log(f"Trades:           {len(closed_trades):>4} executed | {len(wins):>4} wins ({len(wins)/len(closed_trades)*100:.1f}%)" if closed_trades else "Trades:           0")
        self.write_log(f"Signals:          {sys_stats.get('total_signals', 0):>4} generated | {sys_stats.get('executed', 0):>4} executed ({sys_stats.get('execution_rate', 0):.1f}%)")
        self.write_log(f"Max Drawdown:     {system.bot.max_drawdown*100:>6.2f}%")
        self.write_log(f"{'─'*120}\n")
        
        return {
            'year': year,
            'return_pct': return_pct,
            'trades': len(closed_trades),
            'wins': len(wins),
            'win_rate': len(wins)/len(closed_trades)*100 if closed_trades else 0,
            'signals': sys_stats.get('total_signals', 0),
            'execution_rate': sys_stats.get('execution_rate', 0),
            'pnl': total_pnl,
            'max_dd': system.bot.max_drawdown
        }, closed_trades
    
    
    def print_final_summary(self, yearly_results, all_trades):
        """
        🔥 ENHANCED: Print summary with ML performance analysis
        """
        if not yearly_results:
            return
        
        self.write_log(f"\n\n{'╔'+'═'*118+'╗'}")
        self.write_log(f"║ {'3-LAYER SYSTEM v5.1 - COMPREHENSIVE BACKTEST RESULTS':^116} ║")
        self.write_log(f"{'╚'+'═'*118+'╝'}\n")
        
        # Year by year table
        self.write_log(f"{'YEAR':<8} {'RETURN':>10} {'TRADES':>10} {'WIN%':>10} {'SIGNALS':>12} {'EXEC %':>10} {'MAX DD%':>10}")
        self.write_log(f"{'─'*120}")
        
        for r in yearly_results:
            self.write_log(f"{r['year']:<8} {r['return_pct']:>+9.2f}% {r['trades']:>10} {r['win_rate']:>9.1f}% "
                          f"{r['signals']:>12} {r['execution_rate']:>9.1f}% {r.get('max_dd', 0)*100:>9.2f}%")
        
        self.write_log(f"{'─'*120}")
        
        # Overall statistics
        avg_return = np.mean([r['return_pct'] for r in yearly_results])
        total_trades = sum(r['trades'] for r in yearly_results)
        total_signals = sum(r['signals'] for r in yearly_results)
        avg_exec_rate = np.mean([r['execution_rate'] for r in yearly_results])
        overall_wr = np.mean([r['win_rate'] for r in yearly_results if r['trades'] > 0])
        max_dd_overall = max([r.get('max_dd', 0) for r in yearly_results])
        
        self.write_log(f"\n📈 OVERALL STATISTICS:")
        self.write_log(f"   Average Annual Return:     {avg_return:>+8.2f}%")
        self.write_log(f"   Total Trades Executed:     {total_trades:>8}")
        self.write_log(f"   Overall Win Rate:          {overall_wr:>8.2f}%")
        self.write_log(f"   Total Signals Generated:   {total_signals:>8}")
        self.write_log(f"   Average Execution Rate:    {avg_exec_rate:>8.2f}%")
        self.write_log(f"   Signals Filtered Out:      {total_signals - total_trades:>8} ({(1-avg_exec_rate/100)*100:.1f}%)")
        self.write_log(f"   Maximum Drawdown:          {max_dd_overall*100:>8.2f}%")
        
        # 🔥 NEW: ML PERFORMANCE ANALYSIS
        if all_trades:
            self.analyze_ml_performance(all_trades)
        
        # Trade analysis
        if all_trades:
            wins = [t for t in all_trades if t['pnl'] > 0]
            losses = [t for t in all_trades if t['pnl'] <= 0]
            
            avg_win = np.mean([t['pnl'] for t in wins]) if wins else 0
            avg_loss = np.mean([t['pnl'] for t in losses]) if losses else 0
            win_rate_actual = len(wins) / len(all_trades) * 100
            
            profit_factor = abs(sum([t['pnl'] for t in wins]) / sum([t['pnl'] for t in losses])) if losses and sum([t['pnl'] for t in losses]) != 0 else 0
            
            self.write_log(f"\n📊 TRADE ANALYSIS:")
            self.write_log(f"   Total Trades:              {len(all_trades):>8}")
            self.write_log(f"   Winning Trades:            {len(wins):>8} ({win_rate_actual:.2f}%)")
            self.write_log(f"   Losing Trades:             {len(losses):>8} ({100-win_rate_actual:.2f}%)")
            self.write_log(f"   Average Win:               ₹{avg_win:>+10,.0f}")
            self.write_log(f"   Average Loss:              ₹{avg_loss:>+10,.0f}")
            self.write_log(f"   Win/Loss Ratio:            {abs(avg_win/avg_loss):.2f}:1" if avg_loss != 0 else "   Win/Loss Ratio:            N/A")
            self.write_log(f"   Profit Factor:             {profit_factor:>8.2f}")
            
            # Setup analysis
            setups = {}
            for t in all_trades:
                setup = t.get('setup', 'unknown')
                if setup not in setups:
                    setups[setup] = {'count': 0, 'wins': 0, 'pnl': 0}
                setups[setup]['count'] += 1
                if t['pnl'] > 0:
                    setups[setup]['wins'] += 1
                setups[setup]['pnl'] += t['pnl']
            
            self.write_log(f"\n🎯 SETUP PERFORMANCE:")
            self.write_log(f"   {'Setup':<30} {'Trades':>10} {'Win%':>10} {'Total P&L':>15}")
            self.write_log(f"   {'─'*70}")
            for setup, stats in sorted(setups.items(), key=lambda x: x[1]['pnl'], reverse=True):
                wr = stats['wins'] / stats['count'] * 100
                self.write_log(f"   {setup:<30} {stats['count']:>10} {wr:>9.1f}% ₹{stats['pnl']:>+12,.0f}")
        
        # Final verdict
        self.write_log(f"\n{'='*120}")
        if avg_return >= 120:
            self.write_log("🔥🔥🔥 EXCEPTIONAL! System with ML lot sizing delivering outstanding returns!".center(120))
        elif avg_return >= 100:
            self.write_log("✅✅ EXCELLENT! Strong performance with ML-based position sizing!".center(120))
        elif avg_return >= 80:
            self.write_log("✅ GOOD! Profitable system with ML optimization!".center(120))
        elif avg_return >= 60:
            self.write_log("⚠️  FAIR. System profitable but needs improvement.".center(120))
        else:
            self.write_log("❌ POOR. System needs significant optimization.".center(120))
        self.write_log(f"{'='*120}\n")
    
    
    def analyze_ml_performance(self, all_trades):
        """
        🔥 NEW: Analyze performance by ML score buckets
        """
        self.write_log(f"\n{'╔'+'═'*118+'╗'}")
        self.write_log(f"║ {'🤖 ML-BASED LOT SIZING PERFORMANCE ANALYSIS':^116} ║")
        self.write_log(f"{'╚'+'═'*118+'╝'}\n")
        
        # Categorize trades by ML score
        buckets = {
            'ML < 15 (0.5x lots)': [],
            '15 ≤ ML < 22 (0.75x lots)': [],
            'ML ≥ 22 (1.25x lots)': []
        }
        
        for trade in all_trades:
            ml_score = trade.get('ml_score', 0)
            
            if ml_score < 15:
                buckets['ML < 15 (0.5x lots)'].append(trade)
            elif ml_score < 22:
                buckets['15 ≤ ML < 22 (0.75x lots)'].append(trade)
            else:
                buckets['ML ≥ 22 (1.25x lots)'].append(trade)
        
        # Analyze each bucket
        self.write_log(f"{'ML Score Range':<30} {'Trades':>10} {'Wins':>10} {'Win Rate':>12} "
                      f"{'Avg P&L':>15} {'Total P&L':>18}")
        self.write_log(f"{'-'*120}")
        
        for label, trades in buckets.items():
            if not trades:
                continue
            
            wins = sum(1 for t in trades if t['pnl'] > 0)
            total = len(trades)
            win_rate = wins / total * 100
            avg_pnl = sum(t['pnl'] for t in trades) / total
            total_pnl = sum(t['pnl'] for t in trades)
            
            self.write_log(f"{label:<30} {total:>10} {wins:>10} {win_rate:>11.1f}% "
                          f"₹{avg_pnl:>+13,.0f} ₹{total_pnl:>+16,.0f}")
        
        self.write_log(f"{'-'*120}")
        
        # Recommendations
        self.write_log(f"\n💡 ML LOT SIZING INSIGHTS:")
        
        weak_trades = buckets['ML < 15 (0.5x lots)']
        medium_trades = buckets['15 ≤ ML < 22 (0.75x lots)']
        strong_trades = buckets['ML ≥ 22 (1.25x lots)']
        
        if weak_trades:
            wr = sum(1 for t in weak_trades if t['pnl'] > 0) / len(weak_trades) * 100
            self.write_log(f"   📉 Weak ML (< 15): {wr:.1f}% win rate → 0.5x lot sizing is PROTECTING capital")
        
        if strong_trades:
            wr = sum(1 for t in strong_trades if t['pnl'] > 0) / len(strong_trades) * 100
            self.write_log(f"   📈 Strong ML (≥ 22): {wr:.1f}% win rate → 1.25x lot sizing is MAXIMIZING gains")
        
        # Calculate impact
        total_with_ml = sum(t['pnl'] for t in all_trades)
        
        # Simulate without ML adjustment (all 1x lots)
        total_without_ml = 0
        for t in all_trades:
            if t.get('ml_adjusted') and 'original_lots' in t:
                # Recalculate with original lots
                multiplier = t['lots'] / t['original_lots'] if t['original_lots'] > 0 else 1
                pnl_without_adjustment = t['pnl'] / multiplier
                total_without_ml += pnl_without_adjustment
            else:
                total_without_ml += t['pnl']
        
        improvement = total_with_ml - total_without_ml
        improvement_pct = (improvement / abs(total_without_ml)) * 100 if total_without_ml != 0 else 0
        
        self.write_log(f"\n📊 ML LOT SIZING IMPACT:")
        self.write_log(f"   Total P&L (with ML sizing):    ₹{total_with_ml:>+12,.0f}")
        self.write_log(f"   Total P&L (without ML sizing): ₹{total_without_ml:>+12,.0f}")
        self.write_log(f"   ML Sizing Improvement:         ₹{improvement:>+12,.0f} ({improvement_pct:+.1f}%)")
        
        if improvement > 0:
            self.write_log(f"\n   ✅ ML-based lot sizing is ADDING value to the system!")
        else:
            self.write_log(f"\n   ⚠️  ML-based lot sizing needs threshold adjustment")
    
    
    # ═══════════════════════════════════════════════════════════════════════
    #                    HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════
    
    def load_full_data(self):
        """Load complete dataset"""
        try:
            print(f"📊 Loading data from: {self.data_file}")
            df = pd.read_csv(self.data_file)
            
            dt_col = None
            for col in df.columns:
                if any(x in str(col).lower() for x in ['date', 'time']):
                    dt_col = col
                    break
            
            if dt_col:
                df['datetime'] = pd.to_datetime(df[dt_col])
                df.set_index('datetime', inplace=True)
            
            col_map = {}
            for col in df.columns:
                cl = str(col).lower()
                if 'close' in cl: col_map[col] = 'close'
                elif 'open' in cl: col_map[col] = 'open'
                elif 'high' in cl: col_map[col] = 'high'
                elif 'low' in cl: col_map[col] = 'low'
            
            df.rename(columns=col_map, inplace=True)
            
            if 'close' not in df.columns:
                df['close'] = df.iloc[:, 0]
            if 'open' not in df.columns:
                df['open'] = df['close'].shift(1).fillna(df['close'])
            if 'high' not in df.columns:
                df['high'] = df[['open', 'close']].max(axis=1)
            if 'low' not in df.columns:
                df['low'] = df[['open', 'close']].min(axis=1)
            
            df = df.loc['2015-01-01':'2026-1-30']
            
            df = df.resample('15min').agg({
                'open': 'first', 'high': 'max',
                'low': 'min', 'close': 'last'
            }).dropna()
            
            print(f"✅ Loaded {len(df):,} bars ({df.index[0].date()} to {df.index[-1].date()})")
            return df
            
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            return None


# ═══════════════════════════════════════════════════════════════════════════════
#                        MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description='3-Layer Trading System v5.1 - With ML-Based Lot Sizing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
WORKFLOW (3 STEPS):
==================

STEP 1: Collect ML Training Data
  python integration_v5_enhanced.py --mode=collect_data
  
  → Runs backtest WITHOUT trained ML (neutral scores)
  → Records EVERY signal + outcome
  → Saves: 3layer_ml_data/year_XXXX_live_data.csv

STEP 2: Train ML Model on Live Data
  python integration_v5_enhanced.py --mode=train_ml
  
  → Trains ML on data from Step 1
  → Learns from ACTUAL 3-layer system behavior
  → Saves: 3layer_results_v5/ml_model_v6.pkl

STEP 3: Full Backtest with ML Lot Sizing
  python integration_v5_enhanced.py --mode=full_backtest
  
  → Runs with trained ML predictions
  → ML adjusts position sizes dynamically
  → Shows performance with ML optimization

ML LOT SIZING RULES:
  ML Score < 15  → 0.5x lots (reduce risk on weak signals)
  ML Score < 22  → 0.75x lots (moderate reduction)
  ML Score ≥ 22  → 1.25x lots (increase on strong signals)
        """
    )
    
    parser.add_argument(
        '--mode',
        type=str,
        default='full_backtest',
        choices=['collect_data', 'train_ml', 'full_backtest'],
        help='Operating mode'
    )
    
    parser.add_argument(
        '--data',
        type=str,
        default='data/NIFTY_1MIN_2015_2025.csv',
        help='Path to market data file'
    )
    
    args = parser.parse_args()
    
    controller = IntegrationController(data_file=args.data)
    
    if args.mode == 'collect_data':
        controller.collect_ml_data()
    
    elif args.mode == 'train_ml':
        controller.train_ml_model()
    
    elif args.mode == 'full_backtest':
        controller.full_backtest()
    
    else:
        print(f"❌ Unknown mode: {args.mode}")
        parser.print_help()


if __name__ == "__main__":
    main()
