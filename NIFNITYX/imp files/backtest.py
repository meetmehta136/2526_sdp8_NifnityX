#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  🚀 JANUARY 2026 TESTING - CORRECTED VERSION                                 ║
║  File: test_jan2026_corrected.py                                             ║
║                                                                                ║
║  Fixed to work with actual TradingBot.generate_signal() method               ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Import all 3 layers
sys.path.append('/mnt/user-data/uploads')
from layer1_trading_bot import TradingBot
from layer2_sentiment import SentimentAnalyzer
from layer3_ml_model import EnhancedMLTradePredictor

print("""
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                🚀 JANUARY 2026 TESTING - 3-LAYER SYSTEM                       ║
║                     Testing on Fresh Market Data                              ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
""")


class RealisticTradeTracker:
    """Tracks trades with realistic entry/exit mechanics"""
    
    def __init__(self):
        self.active_trades = []
        self.completed_trades = []
        self.trade_id_counter = 0
    
    def enter_trade(self, signal, timestamp, lots_multiplier, technical_score, 
                    sentiment_score, ml_score, final_score):
        """Enter a new trade"""
        trade = {
            'id': self.trade_id_counter,
            'entry_time': timestamp,
            'action': signal['action'],
            'entry_price': signal['price'],
            'stop_loss': signal['stop'],
            'target': signal['target'],
            'lots': lots_multiplier,
            'technical_score': technical_score,
            'sentiment_score': sentiment_score,
            'ml_score': ml_score,
            'final_score': final_score,
            'setup': signal.get('setup', 'unknown'),
            'rr': signal.get('rr', 0),
            'exit_time': None,
            'exit_price': None,
            'exit_reason': None,
            'pnl': None,
            'won': None,
            'bars_held': 0
        }
        
        self.active_trades.append(trade)
        self.trade_id_counter += 1
        return trade['id']
    
    def update_trades(self, current_bar, timestamp):
        """Update all active trades with current bar data"""
        high = current_bar['high']
        low = current_bar['low']
        close = current_bar['close']
        
        trades_to_close = []
        
        for trade in self.active_trades:
            trade['bars_held'] += 1
            
            # Check for exits
            if trade['action'] == 'BUY':
                # Check stop loss
                if low <= trade['stop_loss']:
                    trade['exit_price'] = trade['stop_loss']
                    trade['exit_reason'] = 'STOP_LOSS'
                    trade['exit_time'] = timestamp
                    trades_to_close.append(trade)
                # Check target
                elif high >= trade['target']:
                    trade['exit_price'] = trade['target']
                    trade['exit_reason'] = 'TARGET'
                    trade['exit_time'] = timestamp
                    trades_to_close.append(trade)
                # Time-based exit (end of day or max bars)
                elif trade['bars_held'] >= 20 or timestamp.hour >= 15:
                    trade['exit_price'] = close
                    trade['exit_reason'] = 'TIME_EXIT'
                    trade['exit_time'] = timestamp
                    trades_to_close.append(trade)
            
            elif trade['action'] == 'SELL':
                # Check stop loss
                if high >= trade['stop_loss']:
                    trade['exit_price'] = trade['stop_loss']
                    trade['exit_reason'] = 'STOP_LOSS'
                    trade['exit_time'] = timestamp
                    trades_to_close.append(trade)
                # Check target
                elif low <= trade['target']:
                    trade['exit_price'] = trade['target']
                    trade['exit_reason'] = 'TARGET'
                    trade['exit_time'] = timestamp
                    trades_to_close.append(trade)
                # Time-based exit
                elif trade['bars_held'] >= 20 or timestamp.hour >= 15:
                    trade['exit_price'] = close
                    trade['exit_reason'] = 'TIME_EXIT'
                    trade['exit_time'] = timestamp
                    trades_to_close.append(trade)
        
        # Close trades and calculate P&L
        for trade in trades_to_close:
            # Calculate P&L
            if trade['action'] == 'BUY':
                points = trade['exit_price'] - trade['entry_price']
            else:  # SELL
                points = trade['entry_price'] - trade['exit_price']
            
            # P&L = points * point_value * lots
            trade['pnl'] = points * 75 * trade['lots']  # NIFTY point value = 75
            trade['won'] = trade['pnl'] > 0
            
            # Move to completed
            self.completed_trades.append(trade)
            self.active_trades.remove(trade)
    
    def close_all_trades(self, current_bar, timestamp):
        """Force close all active trades (end of test)"""
        close = current_bar['close']
        
        for trade in self.active_trades:
            trade['exit_price'] = close
            trade['exit_reason'] = 'END_OF_TEST'
            trade['exit_time'] = timestamp
            
            # Calculate P&L
            if trade['action'] == 'BUY':
                points = trade['exit_price'] - trade['entry_price']
            else:
                points = trade['entry_price'] - trade['exit_price']
            
            trade['pnl'] = points * 75 * trade['lots']
            trade['won'] = trade['pnl'] > 0
            
            self.completed_trades.append(trade)
        
        self.active_trades = []
    
    def get_completed_trades(self):
        """Return all completed trades"""
        return self.completed_trades


class Jan2026Tester:
    """Tests the 3-layer system on January 2026 data"""
    
    def __init__(self, data_file, ml_model_path=None, capital=100000):
        self.data_file = data_file
        self.ml_model_path = ml_model_path
        self.capital = capital
        
        # Initialize layers
        self.bot = TradingBot(capital=capital)
        self.sentiment = SentimentAnalyzer()
        
        # Load ML model
        if ml_model_path and os.path.exists(ml_model_path):
            print(f"📊 Loading pre-trained ML model from: {ml_model_path}")
            self.ml_predictor = EnhancedMLTradePredictor()
            self.ml_predictor.load_model(ml_model_path)
            self.use_ml = True
        else:
            print("⚠️  No ML model found - running with neutral ML scores")
            self.ml_predictor = None
            self.use_ml = False
        
        # Trade tracker
        self.trade_tracker = RealisticTradeTracker()
        
        print("✅ Jan 2026 Tester initialized\n")
    
    def load_data(self):
        """Load and prepare January 2026 data"""
        print(f"📊 Loading January 2026 data from: {self.data_file}")
        
        try:
            df = pd.read_csv(self.data_file)
            
            # Find datetime column
            dt_col = None
            for col in df.columns:
                if any(x in str(col).lower() for x in ['date', 'time', 'datetime']):
                    dt_col = col
                    break
            
            if dt_col is None:
                raise ValueError("No datetime column found!")
            
            df['datetime'] = pd.to_datetime(df[dt_col])
            df.set_index('datetime', inplace=True)
            
            # Map columns
            col_map = {}
            for col in df.columns:
                cl = str(col).lower()
                if 'close' in cl and 'close' not in col_map.values():
                    col_map[col] = 'close'
                elif 'open' in cl and 'open' not in col_map.values():
                    col_map[col] = 'open'
                elif 'high' in cl and 'high' not in col_map.values():
                    col_map[col] = 'high'
                elif 'low' in cl and 'low' not in col_map.values():
                    col_map[col] = 'low'
            
            df.rename(columns=col_map, inplace=True)
            
            # Ensure OHLC
            required_cols = ['open', 'high', 'low', 'close']
            for col in required_cols:
                if col not in df.columns:
                    if col == 'close':
                        df['close'] = df.iloc[:, 0]
                    elif col == 'open':
                        df['open'] = df['close'].shift(1).fillna(df['close'])
                    elif col == 'high':
                        df['high'] = df[['open', 'close']].max(axis=1)
                    elif col == 'low':
                        df['low'] = df[['open', 'close']].min(axis=1)
            
            # Filter to January 2026
            df = df.loc['2026-01-01':'2026-01-31']
            
            if len(df) == 0:
                raise ValueError("No data found for January 2026!")
            
            # Resample to 15min
            df = df.resample('15min').agg({
                'open': 'first',
                'high': 'max',
                'low': 'min',
                'close': 'last'
            }).dropna()
            
            print(f"✅ Loaded {len(df):,} bars")
            print(f"   Date range: {df.index[0].date()} to {df.index[-1].date()}")
            print(f"   Price range: ₹{df['close'].min():.2f} - ₹{df['close'].max():.2f}\n")
            
            return df
            
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def run_backtest(self):
        """Run complete backtest with realistic trade tracking"""
        # Load data
        df = self.load_data()
        if df is None:
            return
        
        print(f"{'='*80}")
        print(f"RUNNING BACKTEST ON JANUARY 2026 DATA".center(80))
        print(f"{'='*80}\n")
        
        # Calculate indicators
        print("📊 Calculating technical indicators...")
        df = self.bot.calculate_indicators(df)
        
        # Get sentiment
        print("📰 Fetching market sentiment...")
        sentiment_data = self.sentiment.get_sentiment_score(force_refresh=True)
        sentiment_score = sentiment_data.get('sentiment_boost', 0)
        disaster_flag = sentiment_data.get('disaster_flag', False)
        
        print(f"   Sentiment Boost: {sentiment_score:+.1f}")
        print(f"   Disaster Flag: {disaster_flag}\n")
        
        # Reset bot
        self.bot.reset_state()
        
        # Backtest loop
        total_bars = len(df)
        signals_generated = 0
        signals_executed = 0
        
        print(f"🔄 Processing {total_bars:,} bars...\n")
        
        for i in range(len(df)):
            timestamp = df.index[i]
            row = df.iloc[i]
            
            if (i + 1) % 50 == 0:
                print(f"   Progress: {i+1:,}/{total_bars:,} ({(i+1)/total_bars*100:.1f}%) | "
                      f"Active: {len(self.trade_tracker.active_trades)} | "
                      f"Completed: {len(self.trade_tracker.completed_trades)}", end='\r')
            
            # Update existing trades
            self.trade_tracker.update_trades(row, timestamp)
            
            # Check for new signals (only if no active trades)
            if len(self.trade_tracker.active_trades) == 0:
                # Use generate_signal method with index
                signal = self.bot.generate_signal(df, i)
                
                if signal:
                    signals_generated += 1
                    
                    # Get scores
                    technical_score = signal.get('technical_score', 50)
                    
                    if self.use_ml and self.ml_predictor:
                        features = signal.get('features', {})
                        ml_pred = self.ml_predictor.predict_single_trade(
                            features, technical_score, sentiment_score
                        )
                        ml_score = ml_pred['ml_score']
                    else:
                        ml_score = 15
                    
                    final_score = technical_score + sentiment_score + ml_score
                    
                    # Lot sizing based on ML score
                    if self.use_ml:
                        if ml_score < 15:
                            lots_mult = 0.5
                        elif ml_score < 22:
                            lots_mult = 0.75
                        else:
                            lots_mult = 1.25
                    else:
                        lots_mult = 1.0
                    
                    # Execute decision
                    execute = not disaster_flag and final_score >= 30
                    
                    if execute:
                        signals_executed += 1
                        self.trade_tracker.enter_trade(
                            signal, timestamp, lots_mult,
                            technical_score, sentiment_score, ml_score, final_score
                        )
        
        # Close remaining trades
        if len(self.trade_tracker.active_trades) > 0:
            last_bar = df.iloc[-1]
            self.trade_tracker.close_all_trades(last_bar, df.index[-1])
        
        print(f"\n\n✅ Backtest complete!")
        print(f"   Total bars processed: {total_bars:,}")
        print(f"   Signals generated: {signals_generated}")
        print(f"   Signals executed: {signals_executed}")
        print(f"   Trades completed: {len(self.trade_tracker.completed_trades)}\n")
        
        # Generate report
        self.generate_report()
    
    def generate_report(self):
        """Generate comprehensive performance report"""
        trades = self.trade_tracker.get_completed_trades()
        
        if not trades:
            print("❌ No completed trades to analyze!")
            return
        
        df = pd.DataFrame(trades)
        
        # Calculate metrics
        total_trades = len(df)
        wins = len(df[df['won'] == True])
        losses = total_trades - wins
        win_rate = wins / total_trades * 100 if total_trades > 0 else 0
        
        total_pnl = df['pnl'].sum()
        avg_win = df[df['won'] == True]['pnl'].mean() if wins > 0 else 0
        avg_loss = df[df['won'] == False]['pnl'].mean() if losses > 0 else 0
        
        profit_factor = abs(avg_win * wins / (avg_loss * losses)) if losses > 0 and avg_loss != 0 else 0
        
        final_capital = self.capital + total_pnl
        return_pct = (final_capital / self.capital - 1) * 100
        
        # Print report
        print(f"{'='*80}")
        print(f"JANUARY 2026 PERFORMANCE REPORT".center(80))
        print(f"{'='*80}\n")
        
        print("📊 OVERALL PERFORMANCE")
        print(f"{'─'*80}")
        print(f"Total Trades:          {total_trades:>10}")
        print(f"Winning Trades:        {wins:>10} ({win_rate:.1f}%)")
        print(f"Losing Trades:         {losses:>10} ({100-win_rate:.1f}%)")
        print(f"")
        print(f"Total P&L:             ₹{total_pnl:>+13,.0f}")
        print(f"Average Win:           ₹{avg_win:>+13,.0f}")
        print(f"Average Loss:          ₹{avg_loss:>+13,.0f}")
        print(f"Profit Factor:         {profit_factor:>14.2f}")
        print(f"")
        print(f"Initial Capital:       ₹{self.capital:>13,.0f}")
        print(f"Final Capital:         ₹{final_capital:>13,.0f}")
        print(f"Return:                {return_pct:>+13.2f}%")
        
        # Exit reason breakdown
        print(f"\n\n📊 EXIT REASON ANALYSIS")
        print(f"{'─'*80}")
        
        for reason in df['exit_reason'].unique():
            subset = df[df['exit_reason'] == reason]
            count = len(subset)
            wins_count = len(subset[subset['won'] == True])
            wr = wins_count / count * 100
            total_pnl_reason = subset['pnl'].sum()
            avg_pnl_reason = subset['pnl'].mean()
            
            print(f"{reason:>15}: {count:>4} trades | {wr:>5.1f}% WR | "
                  f"Avg: ₹{avg_pnl_reason:>+10,.0f} | Total: ₹{total_pnl_reason:>+12,.0f}")
        
        # ML Performance
        if self.use_ml:
            print(f"\n\n📊 ML LOT SIZING PERFORMANCE")
            print(f"{'─'*80}")
            
            for min_ml, max_ml, label, mult in [
                (0, 15, 'Weak (0.5x)', 0.5),
                (15, 22, 'Medium (0.75x)', 0.75),
                (22, 100, 'Strong (1.25x)', 1.25)
            ]:
                subset = df[(df['ml_score'] >= min_ml) & (df['ml_score'] < max_ml)]
                if len(subset) > 0:
                    wins_count = len(subset[subset['won'] == True])
                    wr = wins_count / len(subset) * 100
                    total_pnl_ml = subset['pnl'].sum()
                    avg_pnl_ml = subset['pnl'].mean()
                    
                    print(f"{label:>18}: {len(subset):>4} trades | {wr:>5.1f}% WR | "
                          f"Avg: ₹{avg_pnl_ml:>+10,.0f} | Total: ₹{total_pnl_ml:>+12,.0f}")
        
        # Daily breakdown
        if 'entry_time' in df.columns:
            print(f"\n\n📊 DAILY BREAKDOWN")
            print(f"{'─'*80}")
            
            df['date'] = pd.to_datetime(df['entry_time']).dt.date
            daily = df.groupby('date').agg({
                'pnl': ['sum', 'count'],
                'won': 'sum'
            })
            
            daily.columns = ['pnl', 'trades', 'wins']
            daily['win_rate'] = daily['wins'] / daily['trades'] * 100
            
            print(f"{'Date':<12} {'Trades':>8} {'Wins':>8} {'Win Rate':>10} {'P&L':>15}")
            print(f"{'─'*80}")
            
            for date, row in daily.iterrows():
                print(f"{str(date):<12} {int(row['trades']):>8} {int(row['wins']):>8} "
                      f"{row['win_rate']:>9.1f}% ₹{row['pnl']:>+13,.0f}")
        
        # Save results
        output_csv = 'jan2026_test_results.csv'
        df.to_csv(output_csv, index=False)
        print(f"\n\n✅ Detailed results saved to: jan2026_test_results.csv")
        
        # Summary report
        output_txt = 'jan2026_summary_report.txt'
        with open(output_txt, 'w', encoding='utf-8') as f:
            f.write("="*80 + "\n")
            f.write("JANUARY 2026 TESTING REPORT\n")
            f.write("="*80 + "\n\n")
            f.write(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Data File: {self.data_file}\n")
            f.write(f"ML Model: {'Enabled' if self.use_ml else 'Disabled'}\n\n")
            f.write(f"Total Trades: {total_trades}\n")
            f.write(f"Win Rate: {win_rate:.1f}%\n")
            f.write(f"Total P&L: ₹{total_pnl:+,.0f}\n")
            f.write(f"Return: {return_pct:+.2f}%\n")
            f.write(f"Profit Factor: {profit_factor:.2f}\n")
        
        print(f"✅ Summary report saved to: jan2026_summary_report.txt\n")


def main():
    """Main entry point"""
    # Find data file
    possible_paths = [
        'data/NIFTY_1MIN_jan2026.csv',
        '/mnt/user-data/uploads/NIFTY_1MIN_jan2026.csv',
        'NIFTY_1MIN_jan2026.csv',
        '/home/claude/NIFTY_1MIN_jan2026.csv'
    ]
    
    data_file = None
    for path in possible_paths:
        if os.path.exists(path):
            data_file = path
            break
    
    if data_file is None:
        print(f"❌ Data file not found. Tried:")
        for path in possible_paths:
            print(f"   - {path}")
        return
    
    print(f"✅ Found data file: {data_file}\n")
    
    # Initialize and run
    tester = Jan2026Tester(
        data_file=data_file,
        ml_model_path='3layer_results_v5/ml_model_v6.pkl',
        capital=100000
    )
    
    tester.run_backtest()
    
    print(f"\n{'='*80}")
    print(f"✅ TESTING COMPLETE!".center(80))
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()