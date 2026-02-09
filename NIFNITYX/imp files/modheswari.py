#!/usr/bin/env python3
"""
🔥 ULTIMATE ML-READY TRADING SYSTEM v17.0
SAME PROVEN LOGIC + COMPREHENSIVE ML DATA COLLECTION
Every bar logged, every decision explained, perfect for ML training
"""

import pandas as pd
import numpy as np
from datetime import datetime
import warnings
import os
from collections import deque
warnings.filterwarnings('ignore')

class UltimateMLTrader:
    def __init__(self, capital=100000):
        self.initial_capital = float(capital)
        self.reset_for_year()
        
        # SAME PROVEN PARAMETERS
        self.lot_size = 75
        self.point_value = 75
        self.base_risk = 0.008
        self.max_risk = 0.015
        self.min_risk = 0.004
        self.max_portfolio_heat = 0.03
        self.min_rr = 2.5
        
        # ML DATA COLLECTION
        self.ml_signals = []  # Every signal (executed + skipped)
        self.ml_bars = []     # Every bar with decision
        
        # OUTPUT
        self.output_dir = "ultimate_ml_results"
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(f"{self.output_dir}/trades", exist_ok=True)
        os.makedirs(f"{self.output_dir}/ml_data", exist_ok=True)
        os.makedirs(f"{self.output_dir}/logs", exist_ok=True)
    
    def reset_for_year(self):
        """Reset for new year"""
        self.capital = float(self.initial_capital)
        self.peak_capital = float(self.initial_capital)
        self.trades = []
        self.equity_curve = [self.initial_capital]
        self.max_drawdown = 0
        self.current_date = None
        self.daily_trades = 0
        self.daily_pnl = 0
        self.portfolio_heat = 0
        self.recent_pnl = deque(maxlen=10)
        self.win_streak = 0
        self.loss_streak = 0
        self.regime = "NEUTRAL"
        self.volatility = "NORMAL"
        self.trade_count = 0
    
    def load_data(self, filepath):
        """Load data"""
        print(f"📊 Loading: {filepath}")
        df = pd.read_csv(filepath)
        
        # Find datetime
        dt_col = None
        for col in df.columns:
            if any(x in str(col).lower() for x in ['date', 'time']):
                dt_col = col
                break
        
        if dt_col:
            df['datetime'] = pd.to_datetime(df[dt_col])
            df.set_index('datetime', inplace=True)
        else:
            df['datetime'] = pd.date_range('2015-01-01', periods=len(df), freq='1min')
            df.set_index('datetime', inplace=True)
        
        # Standardize
        col_map = {}
        for col in df.columns:
            cl = str(col).lower()
            if 'close' in cl or 'price' in cl: col_map[col] = 'close'
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
        
        print(f"✅ Loaded {len(df):,} rows")
        
        # Resample
        df = df.resample('15min').agg({
            'open': 'first', 'high': 'max',
            'low': 'min', 'close': 'last'
        }).dropna()
        
        print(f"✅ Resampled to {len(df):,} bars")
        
        return self.add_indicators(df)
    
    def add_indicators(self, df):
        """Add indicators"""
        df = df.copy()
        
        # EMAs
        for p in [9, 21, 50, 100]:
            df[f'ema{p}'] = df['close'].ewm(span=p).mean()
        
        # ATR
        hl = df['high'] - df['low']
        hc = abs(df['high'] - df['close'].shift())
        lc = abs(df['low'] - df['close'].shift())
        tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        df['atr'] = tr.rolling(14).mean()
        df['atr_pct'] = df['atr'] / df['close'] * 100
        
        # RSI
        delta = df['close'].diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = -delta.where(delta < 0, 0).rolling(14).mean()
        rs = gain / (loss + 0.0001)
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # MACD
        df['macd'] = df['close'].ewm(12).mean() - df['close'].ewm(26).mean()
        df['macd_sig'] = df['macd'].ewm(9).mean()
        df['macd_hist'] = df['macd'] - df['macd_sig']
        
        # Bollinger
        df['bb_mid'] = df['close'].rolling(20).mean()
        bb_std = df['close'].rolling(20).std()
        df['bb_upper'] = df['bb_mid'] + 2*bb_std
        df['bb_lower'] = df['bb_mid'] - 2*bb_std
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_mid']
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'] + 0.0001)
        
        # ADX
        df['adx'] = self.calc_adx(df)
        
        # Support/Resistance
        df['resistance'] = df['high'].rolling(30).max()
        df['support'] = df['low'].rolling(30).min()
        
        # Momentum
        df['mom10'] = (df['close'] / df['close'].shift(10) - 1) * 100
        df['mom20'] = (df['close'] / df['close'].shift(20) - 1) * 100
        
        # Trend signals
        df['trend_up'] = ((df['ema9'] > df['ema21']) & (df['ema21'] > df['ema50'])).astype(int)
        df['trend_down'] = ((df['ema9'] < df['ema21']) & (df['ema21'] < df['ema50'])).astype(int)
        
        # Distance from EMAs
        df['dist_ema9'] = (df['close'] / df['ema9'] - 1) * 100
        df['dist_ema21'] = (df['close'] / df['ema21'] - 1) * 100
        df['dist_ema50'] = (df['close'] / df['ema50'] - 1) * 100
        
        # Time features
        df['hour'] = df.index.hour
        df['minute'] = df.index.minute
        df['day_of_week'] = df.index.dayofweek
        
        df = df.fillna(method='ffill').fillna(0)
        return df
    
    def calc_adx(self, df, period=14):
        """Calculate ADX"""
        high, low, close = df['high'], df['low'], df['close']
        
        up = high.diff()
        down = -low.diff()
        
        plus_dm = up.where((up > down) & (up > 0), 0)
        minus_dm = down.where((down > up) & (down > 0), 0)
        
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(period).mean()
        
        plus_di = 100 * plus_dm.rolling(period).mean() / (atr + 0.0001)
        minus_di = 100 * minus_dm.rolling(period).mean() / (atr + 0.0001)
        
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 0.0001)
        adx = dx.rolling(period).mean()
        
        return adx.fillna(25)
    
    def generate_signal(self, df, idx):
        """Generate signal - SAME PROVEN LOGIC"""
        if idx < 100:
            return None, "insufficient_history"
        
        row = df.iloc[idx]
        
        # Update regime
        if row['adx'] > 25:
            if row['trend_up']:
                self.regime = "UPTREND"
            elif row['trend_down']:
                self.regime = "DOWNTREND"
            else:
                self.regime = "MIXED"
        else:
            self.regime = "RANGING"
        
        # TREND FOLLOWING - BUY
        if row['adx'] > 28 and row['trend_up'] and self.regime == "UPTREND":
            pullback = row['low'] <= row['ema21'] * 1.003 and row['close'] > row['ema21']
            momentum_ok = row['mom10'] > 0.3 and row['rsi'] > 45 and row['rsi'] < 70
            macd_ok = row['macd'] > row['macd_sig']
            
            # Check each condition
            if not pullback:
                return None, "no_pullback"
            if not momentum_ok:
                return None, f"momentum_fail_mom:{row['mom10']:.2f}_rsi:{row['rsi']:.1f}"
            if not macd_ok:
                return None, "macd_bearish"
            
            # All conditions met - generate signal
            atr_stop = row['close'] - 1.8 * row['atr']
            ema_stop = row['ema50']
            stop = max(atr_stop, ema_stop, row['support'], row['close'] - 50)
            
            risk_pts = row['close'] - stop
            if risk_pts < 20:
                stop = row['close'] - 20
                risk_pts = 20
            
            target = row['close'] + risk_pts * 3.0
            
            return {
                'action': 'BUY',
                'price': row['close'],
                'stop': stop,
                'target': target,
                'confidence': 0.80,
                'rr': 3.0,
                'setup': 'trend_pullback_buy'
            }, None
        
        # TREND FOLLOWING - SELL
        elif row['adx'] > 28 and row['trend_down'] and self.regime == "DOWNTREND":
            bounce = row['high'] >= row['ema21'] * 0.997 and row['close'] < row['ema21']
            momentum_ok = row['mom10'] < -0.3 and row['rsi'] < 55 and row['rsi'] > 30
            macd_ok = row['macd'] < row['macd_sig']
            
            if not bounce:
                return None, "no_bounce"
            if not momentum_ok:
                return None, f"momentum_fail_mom:{row['mom10']:.2f}_rsi:{row['rsi']:.1f}"
            if not macd_ok:
                return None, "macd_bullish"
            
            atr_stop = row['close'] + 1.8 * row['atr']
            ema_stop = row['ema50']
            stop = min(atr_stop, ema_stop, row['resistance'], row['close'] + 50)
            
            risk_pts = stop - row['close']
            if risk_pts < 20:
                stop = row['close'] + 20
                risk_pts = 20
            
            target = row['close'] - risk_pts * 3.0
            
            return {
                'action': 'SELL',
                'price': row['close'],
                'stop': stop,
                'target': target,
                'confidence': 0.80,
                'rr': 3.0,
                'setup': 'trend_bounce_sell'
            }, None
        
        # No signal
        if row['adx'] <= 28:
            return None, f"weak_trend_adx:{row['adx']:.1f}"
        elif not row['trend_up'] and not row['trend_down']:
            return None, "no_ema_alignment"
        elif self.regime not in ["UPTREND", "DOWNTREND"]:
            return None, f"regime:{self.regime}"
        
        return None, "no_setup"
    
    def calc_position_size(self, signal):
        """Calculate position - SAME PROVEN LOGIC"""
        risk_pts = abs(signal['price'] - signal['stop'])
        
        risk_pct = self.base_risk * signal['confidence']
        
        # Recent performance adjustment
        if len(self.recent_pnl) >= 5:
            win_rate = sum(1 for p in self.recent_pnl if p > 0) / len(self.recent_pnl)
            if win_rate > 0.7:
                risk_pct *= 1.3
            elif win_rate < 0.4:
                risk_pct *= 0.6
        
        if self.loss_streak >= 2:
            risk_pct *= 0.5
        elif self.win_streak >= 3:
            risk_pct *= 1.2
        
        risk_pct = max(self.min_risk, min(self.max_risk, risk_pct))
        
        # Portfolio heat check
        if self.portfolio_heat + risk_pct > self.max_portfolio_heat:
            return None, f"portfolio_heat:{self.portfolio_heat:.3f}_limit:{self.max_portfolio_heat}"
        
        risk_amount = self.capital * risk_pct
        lots = int(risk_amount / (risk_pts * self.point_value))
        lots = max(1, min(lots, 6))
        
        actual_risk_pct = lots * risk_pts * self.point_value / self.capital
        
        return {
            'lots': lots,
            'risk_pct': actual_risk_pct,
            'risk_amount': lots * risk_pts * self.point_value
        }, None
    
    def enter_trade(self, signal, pos, timestamp, idx, df):
        """Enter trade with DETAILED OUTPUT"""
        self.trade_count += 1
        tid = self.trade_count
        
        row = df.iloc[idx]
        
        trade = {
            'id': tid,
            'time': timestamp,
            'action': signal['action'],
            'price': signal['price'],
            'stop': signal['stop'],
            'target': signal['target'],
            'lots': pos['lots'],
            'risk_pct': pos['risk_pct'],
            'risk_amount': pos['risk_amount'],
            'setup': signal['setup'],
            'status': 'OPEN',
            'entry_idx': idx,
            'partial_closed': False,
            'trail_stop': signal['stop'],
            # Market context
            'entry_adx': row['adx'],
            'entry_rsi': row['rsi'],
            'entry_macd': row['macd'],
            'entry_atr_pct': row['atr_pct'],
            'entry_regime': self.regime,
            'entry_capital': self.capital,
            'entry_dd': (self.peak_capital - self.capital) / self.peak_capital * 100
        }
        
        self.trades.append(trade)
        self.daily_trades += 1
        self.portfolio_heat += pos['risk_pct']
        
        # DETAILED TRADE OUTPUT
        print(f"\n{'='*100}")
        print(f"🎯 TRADE #{tid} EXECUTED - {signal['action']} {signal['setup'].upper()}")
        print(f"{'='*100}")
        print(f"⏰ Time:        {timestamp.strftime('%Y-%m-%d %H:%M')}")
        print(f"💰 Price:       ₹{signal['price']:.2f}")
        print(f"🛑 Stop:        ₹{signal['stop']:.2f} ({abs(signal['price']-signal['stop']):.1f} pts)")
        print(f"🎯 Target:      ₹{signal['target']:.2f} ({abs(signal['target']-signal['price']):.1f} pts)")
        print(f"📊 Position:    {pos['lots']} lots ({pos['lots']*self.lot_size} qty)")
        print(f"⚠️  Risk:        ₹{pos['risk_amount']:,.0f} ({pos['risk_pct']*100:.2f}% of capital)")
        print(f"📈 R:R:         1:{signal['rr']:.1f}")
        print(f"")
        print(f"📊 MARKET CONTEXT:")
        print(f"   Regime:      {self.regime}")
        print(f"   ADX:         {row['adx']:.1f}")
        print(f"   RSI:         {row['rsi']:.1f}")
        print(f"   MACD:        {row['macd']:.3f} (Signal: {row['macd_sig']:.3f})")
        print(f"   Mom 10:      {row['mom10']:.2f}%")
        print(f"   ATR:         {row['atr_pct']:.2f}%")
        print(f"")
        print(f"💼 ACCOUNT STATUS:")
        print(f"   Capital:     ₹{self.capital:,.0f}")
        print(f"   Peak:        ₹{self.peak_capital:,.0f}")
        print(f"   Drawdown:    {(self.peak_capital-self.capital)/self.peak_capital*100:.2f}%")
        print(f"   Daily P&L:   ₹{self.daily_pnl:+,.0f}")
        print(f"   Daily Trades:{self.daily_trades}")
        print(f"   Win Streak:  {self.win_streak}")
        print(f"   Loss Streak: {self.loss_streak}")
        print(f"{'='*100}\n")
    
    def manage_positions(self, df, idx):
        """Manage positions - SAME PROVEN LOGIC"""
        price = df['close'].iloc[idx]
        timestamp = df.index[idx]
        
        for trade in [t for t in self.trades if t.get('status') == 'OPEN']:
            if trade['action'] == 'BUY':
                pnl_pts = price - trade['price']
                risk_pts = trade['price'] - trade['stop']
                
                # Scale out at 1.5R
                if not trade['partial_closed'] and pnl_pts >= risk_pts * 1.5:
                    partial_lots = trade['lots'] // 2
                    if partial_lots > 0:
                        partial_pnl = partial_lots * pnl_pts * self.point_value
                        self.capital += partial_pnl
                        self.daily_pnl += partial_pnl
                        trade['lots'] -= partial_lots
                        trade['partial_closed'] = True
                        trade['trail_stop'] = trade['price']
                        
                        print(f"💰 PARTIAL EXIT - Trade #{trade['id']}: {partial_lots} lots @ ₹{price:.2f} = ₹{partial_pnl:+,.0f}")
                
                # Trail
                if pnl_pts > risk_pts * 1.0:
                    new_stop = trade['price'] + risk_pts * 0.7
                    if new_stop > trade['trail_stop']:
                        trade['trail_stop'] = new_stop
                
                # Exit
                if price <= trade['trail_stop']:
                    self.exit_trade(trade, trade['trail_stop'], timestamp, 'STOP_HIT', df, idx)
                elif price >= trade['target']:
                    self.exit_trade(trade, trade['target'], timestamp, 'TARGET_HIT', df, idx)
            
            else:  # SELL
                pnl_pts = trade['price'] - price
                risk_pts = trade['stop'] - trade['price']
                
                # Scale out
                if not trade['partial_closed'] and pnl_pts >= risk_pts * 1.5:
                    partial_lots = trade['lots'] // 2
                    if partial_lots > 0:
                        partial_pnl = partial_lots * pnl_pts * self.point_value
                        self.capital += partial_pnl
                        self.daily_pnl += partial_pnl
                        trade['lots'] -= partial_lots
                        trade['partial_closed'] = True
                        trade['trail_stop'] = trade['price']
                        
                        print(f"💰 PARTIAL EXIT - Trade #{trade['id']}: {partial_lots} lots @ ₹{price:.2f} = ₹{partial_pnl:+,.0f}")
                
                # Trail
                if pnl_pts > risk_pts * 1.0:
                    new_stop = trade['price'] - risk_pts * 0.7
                    if new_stop < trade['trail_stop']:
                        trade['trail_stop'] = new_stop
                
                # Exit
                if price >= trade['trail_stop']:
                    self.exit_trade(trade, trade['trail_stop'], timestamp, 'STOP_HIT', df, idx)
                elif price <= trade['target']:
                    self.exit_trade(trade, trade['target'], timestamp, 'TARGET_HIT', df, idx)
    
    def exit_trade(self, trade, exit_price, timestamp, reason, df, idx):
        """Exit trade with DETAILED OUTPUT"""
        row = df.iloc[idx]
        
        if trade['action'] == 'BUY':
            pnl_pts = exit_price - trade['price']
        else:
            pnl_pts = trade['price'] - exit_price
        
        pnl = pnl_pts * trade['lots'] * self.point_value
        duration = (timestamp - trade['time']).total_seconds() / 60
        
        self.capital += pnl
        self.daily_pnl += pnl
        self.equity_curve.append(self.capital)
        self.portfolio_heat -= trade.get('risk_pct', 0)
        self.portfolio_heat = max(0, self.portfolio_heat)
        
        trade['exit_price'] = exit_price
        trade['exit_time'] = timestamp
        trade['exit_reason'] = reason
        trade['pnl'] = pnl
        trade['pnl_pts'] = pnl_pts
        trade['duration_min'] = duration
        trade['status'] = 'CLOSED'
        trade['exit_adx'] = row['adx']
        trade['exit_rsi'] = row['rsi']
        trade['exit_capital'] = self.capital
        
        # Update streaks
        if pnl > 0:
            self.win_streak += 1
            self.loss_streak = 0
            result = "WIN"
            emoji = "🟢"
        else:
            self.win_streak = 0
            self.loss_streak += 1
            result = "LOSS"
            emoji = "🔴"
        
        self.recent_pnl.append(pnl)
        
        if self.capital > self.peak_capital:
            self.peak_capital = self.capital
        
        dd = (self.peak_capital - self.capital) / self.peak_capital
        if dd > self.max_drawdown:
            self.max_drawdown = dd
        
        # Calculate R-multiple
        risk = trade['risk_amount']
        r_multiple = pnl / risk if risk > 0 else 0
        
        # DETAILED EXIT OUTPUT
        print(f"\n{'='*100}")
        print(f"{emoji} TRADE #{trade['id']} CLOSED - {result}")
        print(f"{'='*100}")
        print(f"⏰ Exit Time:   {timestamp.strftime('%Y-%m-%d %H:%M')}")
        print(f"💰 Exit Price:  ₹{exit_price:.2f}")
        print(f"📊 Exit Reason: {reason}")
        print(f"⏱️  Duration:    {duration:.0f} minutes")
        print(f"")
        print(f"💵 PROFIT/LOSS:")
        print(f"   P&L:         ₹{pnl:+,.0f}")
        print(f"   Points:      {pnl_pts:+.1f}")
        print(f"   R-Multiple:  {r_multiple:+.2f}R")
        print(f"   ROI:         {(pnl/trade['risk_amount'])*100:+.1f}%")
        print(f"")
        print(f"💼 UPDATED ACCOUNT:")
        print(f"   Capital:     ₹{self.capital:,.0f} ({pnl:+,.0f})")
        print(f"   Daily P&L:   ₹{self.daily_pnl:+,.0f}")
        print(f"   Max DD:      {self.max_drawdown*100:.2f}%")
        print(f"   Win Streak:  {self.win_streak}")
        print(f"   Loss Streak: {self.loss_streak}")
        print(f"{'='*100}\n")
    
    def log_bar_decision(self, df, idx, timestamp, signal, signal_reason, pos, pos_reason, executed):
        """Log every bar for ML training"""
        row = df.iloc[idx]
        
        ml_record = {
            # Timestamp
            'timestamp': timestamp,
            'year': timestamp.year,
            'month': timestamp.month,
            'day': timestamp.day,
            'hour': timestamp.hour,
            'minute': timestamp.minute,
            'day_of_week': timestamp.dayofweek,
            
            # Price data
            'open': row['open'],
            'high': row['high'],
            'low': row['low'],
            'close': row['close'],
            
            # Indicators
            'ema9': row['ema9'],
            'ema21': row['ema21'],
            'ema50': row['ema50'],
            'ema100': row['ema100'],
            'dist_ema9': row['dist_ema9'],
            'dist_ema21': row['dist_ema21'],
            'dist_ema50': row['dist_ema50'],
            'atr': row['atr'],
            'atr_pct': row['atr_pct'],
            'rsi': row['rsi'],
            'macd': row['macd'],
            'macd_sig': row['macd_sig'],
            'macd_hist': row['macd_hist'],
            'adx': row['adx'],
            'bb_mid': row['bb_mid'],
            'bb_upper': row['bb_upper'],
            'bb_lower': row['bb_lower'],
            'bb_width': row['bb_width'],
            'bb_position': row['bb_position'],
            'mom10': row['mom10'],
            'mom20': row['mom20'],
            'resistance': row['resistance'],
            'support': row['support'],
            'trend_up': row['trend_up'],
            'trend_down': row['trend_down'],
            
            # Account state
            'capital': self.capital,
            'peak_capital': self.peak_capital,
            'drawdown_pct': (self.peak_capital - self.capital) / self.peak_capital * 100,
            'daily_pnl': self.daily_pnl,
            'daily_trades': self.daily_trades,
            'portfolio_heat': self.portfolio_heat,
            'win_streak': self.win_streak,
            'loss_streak': self.loss_streak,
            'regime': self.regime,
            
            # Recent performance
            'recent_win_rate': sum(1 for p in self.recent_pnl if p > 0) / len(self.recent_pnl) if len(self.recent_pnl) > 0 else 0.5,
            'recent_avg_pnl': np.mean(list(self.recent_pnl)) if len(self.recent_pnl) > 0 else 0,
            
            # Signal info
            'signal_generated': 1 if signal else 0,
            'signal_reason': signal_reason if not signal else 'SIGNAL_OK',
            'signal_action': signal['action'] if signal else 'NONE',
            'signal_confidence': signal['confidence'] if signal else 0,
            'signal_rr': signal['rr'] if signal else 0,
            'signal_setup': signal['setup'] if signal else 'NONE',
            
            # Position sizing
            'position_approved': 1 if pos else 0,
            'position_reason': pos_reason if not pos else 'POS_OK',
            'position_lots': pos['lots'] if pos else 0,
            'position_risk_pct': pos['risk_pct'] * 100 if pos else 0,
            
            # Final decision
            'trade_executed': 1 if executed else 0,
            'skip_reason': pos_reason if not executed and signal else (signal_reason if not signal else 'NONE'),
            
            # Trade outcome (to be filled later if executed)
            'trade_id': None,
            'trade_pnl': None,
            'trade_r_multiple': None,
            'trade_won': None
        }
        
        self.ml_bars.append(ml_record)
    
    def run_year(self, df_year, year):
        """Run backtest for one year - SAME PROVEN LOGIC + ML LOGGING"""
        print(f"\n{'='*100}")
        print(f"🚀 RUNNING YEAR {year}".center(100))
        print(f"{'='*100}\n")
        
        for idx in range(100, len(df_year)-5):
            timestamp = df_year.index[idx]
            
            # Daily reset
            if self.current_date != timestamp.date():
                self.current_date = timestamp.date()
                self.daily_trades = 0
                self.daily_pnl = 0
            
            # Trading hours
            hour = timestamp.hour
            if hour < 9 or hour > 15:
                continue
            if (hour == 9 and timestamp.minute < 30) or (hour == 15 and timestamp.minute > 30):
                continue
            
            # Manage open positions
            self.manage_positions(df_year, idx)
            
            # Check if can trade
            can_trade = True
            skip_reason = None
            
            if self.daily_pnl < -self.capital * 0.025:
                can_trade = False
                skip_reason = f"daily_loss_limit:{self.daily_pnl:,.0f}"
            elif self.daily_trades >= 8:
                can_trade = False
                skip_reason = f"daily_trade_limit:{self.daily_trades}"
            
            open_count = len([t for t in self.trades if t.get('status') == 'OPEN'])
            if open_count >= 2:
                can_trade = False
                skip_reason = f"max_positions:{open_count}"
            
            # Generate signal
            signal, signal_reason = self.generate_signal(df_year, idx)
            
            # Position sizing
            pos = None
            pos_reason = None
            
            if signal and can_trade:
                if signal['rr'] < self.min_rr:
                    pos_reason = f"low_rr:{signal['rr']:.1f}"
                else:
                    pos, pos_reason = self.calc_position_size(signal)
            elif not can_trade:
                pos_reason = skip_reason
            
            # Execute trade
            executed = False
            if signal and pos and can_trade:
                self.enter_trade(signal, pos, timestamp, idx, df_year)
                executed = True
            
            # Log every bar for ML
            self.log_bar_decision(df_year, idx, timestamp, signal, signal_reason, pos, pos_reason, executed)
        
        # Close all open
        if len(df_year) > 0:
            price = df_year['close'].iloc[-1]
            timestamp = df_year.index[-1]
            for t in [t for t in self.trades if t.get('status') == 'OPEN']:
                self.exit_trade(t, price, timestamp, 'YEAR_END', df_year, len(df_year)-1)
        
        return self.get_year_stats(year)
    
    def get_year_stats(self, year):
        """Get year statistics"""
        closed = [t for t in self.trades if t.get('status') == 'CLOSED']
        
        if not closed:
            return {
                'year': year,
                'initial': self.initial_capital,
                'final': self.capital,
                'pnl': 0,
                'return_pct': 0,
                'trades': 0,
                'wins': 0,
                'win_rate': 0,
                'max_dd': 0,
                'profit_factor': 0,
                'avg_win': 0,
                'avg_loss': 0,
                'largest_win': 0,
                'largest_loss': 0
            }
        
        wins = [t for t in closed if t['pnl'] > 0]
        losses = [t for t in closed if t['pnl'] <= 0]
        
        total_pnl = sum(t['pnl'] for t in closed)
        return_pct = (self.capital / self.initial_capital - 1) * 100
        
        gross_profit = sum(t['pnl'] for t in wins) if wins else 0
        gross_loss = abs(sum(t['pnl'] for t in losses)) if losses else 0.01
        profit_factor = gross_profit / gross_loss
        
        return {
            'year': year,
            'initial': self.initial_capital,
            'final': self.capital,
            'pnl': total_pnl,
            'return_pct': return_pct,
            'trades': len(closed),
            'wins': len(wins),
            'win_rate': len(wins)/len(closed)*100 if closed else 0,
            'max_dd': self.max_drawdown * 100,
            'profit_factor': profit_factor,
            'avg_win': np.mean([t['pnl'] for t in wins]) if wins else 0,
            'avg_loss': np.mean([t['pnl'] for t in losses]) if losses else 0,
            'largest_win': max([t['pnl'] for t in wins]) if wins else 0,
            'largest_loss': min([t['pnl'] for t in losses]) if losses else 0
        }
    
    def run_yearly_analysis(self, df):
        """Run year-by-year analysis"""
        print(f"\n{'='*120}")
        print(f"🔥 ULTIMATE ML-READY TRADING SYSTEM v17.0".center(120))
        print(f"{'='*120}\n")
        
        years = sorted(df.index.year.unique())
        results = []
        
        for year in years:
            year_data = df[df.index.year == year].copy()
            
            if len(year_data) < 100:
                print(f"⚠️  Year {year}: Insufficient data - SKIPPING\n")
                continue
            
            # Reset
            self.reset_for_year()
            self.ml_bars = []
            
            # Run
            result = self.run_year(year_data, year)
            results.append(result)
            
            # Print year summary
            print(f"\n{'─'*100}")
            print(f"📊 YEAR {year} SUMMARY")
            print(f"{'─'*100}")
            print(f"   Capital:        ₹{result['initial']:,.0f} → ₹{result['final']:,.0f}")
            print(f"   P&L:            ₹{result['pnl']:+,.0f} ({result['return_pct']:+.1f}%)")
            print(f"   Trades:         {result['trades']}")
            print(f"   Wins:           {result['wins']} ({result['win_rate']:.1f}%)")
            print(f"   Avg Win:        ₹{result['avg_win']:+,.0f}")
            print(f"   Avg Loss:       ₹{result['avg_loss']:+,.0f}")
            print(f"   Largest Win:    ₹{result['largest_win']:+,.0f}")
            print(f"   Largest Loss:   ₹{result['largest_loss']:+,.0f}")
            print(f"   Max DD:         {result['max_dd']:.2f}%")
            print(f"   Profit Factor:  {result['profit_factor']:.2f}")
            
            # Rating
            if result['return_pct'] >= 60:
                rating = "🔥 EXCEPTIONAL"
            elif result['return_pct'] >= 40:
                rating = "✅ EXCELLENT"
            elif result['return_pct'] >= 25:
                rating = "✅ GOOD"
            elif result['return_pct'] >= 10:
                rating = "⚠️  FAIR"
            elif result['return_pct'] >= 0:
                rating = "⚠️  POOR"
            else:
                rating = "❌ LOSS"
            
            print(f"   Rating:         {rating}")
            print(f"{'─'*100}\n")
            
            # Save year data
            if self.trades:
                # Save trades
                trades_df = pd.DataFrame([t for t in self.trades if t.get('status')=='CLOSED'])
                trades_df.to_csv(f'{self.output_dir}/trades/year_{year}_trades.csv', index=False)
                
                # Save ML bar data
                ml_df = pd.DataFrame(self.ml_bars)
                
                # Update ML data with trade outcomes
                for trade in [t for t in self.trades if t.get('status') == 'CLOSED']:
                    entry_time = trade['time']
                    mask = ml_df['timestamp'] == entry_time
                    if mask.any():
                        ml_df.loc[mask, 'trade_id'] = trade['id']
                        ml_df.loc[mask, 'trade_pnl'] = trade['pnl']
                        ml_df.loc[mask, 'trade_r_multiple'] = trade['pnl'] / trade['risk_amount']
                        ml_df.loc[mask, 'trade_won'] = 1 if trade['pnl'] > 0 else 0
                
                ml_df.to_csv(f'{self.output_dir}/ml_data/year_{year}_ml_bars.csv', index=False)
                
                print(f"💾 Saved {len(trades_df)} trades and {len(ml_df)} ML bars for year {year}")
        
        # Print consolidated summary
        self.print_summary(results)
        
        return results
    
    def print_summary(self, results):
        """Print consolidated summary"""
        if not results:
            return
        
        print(f"\n\n{'='*120}")
        print(f"📊 CONSOLIDATED SUMMARY - ALL YEARS".center(120))
        print(f"{'='*120}\n")
        
        print(f"{'YEAR':<8} {'INITIAL':<12} {'FINAL':<12} {'P&L':<14} {'RETURN':<10} "
              f"{'TRADES':<8} {'WIN%':<8} {'MAX DD':<8} {'PF':<6}")
        print(f"{'─'*120}")
        
        for r in results:
            print(f"{r['year']:<8} ₹{r['initial']:>9,.0f}  ₹{r['final']:>9,.0f}  "
                  f"₹{r['pnl']:>+11,.0f}  {r['return_pct']:>+7.1f}%  "
                  f"{r['trades']:>6}  {r['win_rate']:>6.1f}%  {r['max_dd']:>6.1f}%  "
                  f"{r['profit_factor']:>4.1f}")
        
        print(f"{'─'*120}")
        
        # Stats
        avg_return = np.mean([r['return_pct'] for r in results])
        profitable_years = len([r for r in results if r['return_pct'] > 0])
        total_years = len(results)
        total_trades = sum(r['trades'] for r in results)
        total_wins = sum(r['wins'] for r in results)
        
        print(f"\n📈 OVERALL STATISTICS:")
        print(f"   Years Tested:            {total_years}")
        print(f"   Profitable Years:        {profitable_years}/{total_years} ({profitable_years/total_years*100:.1f}%)")
        print(f"   Average Annual Return:   {avg_return:+.1f}%")
        print(f"   Best Year:               {max(results, key=lambda x: x['return_pct'])['year']} ({max(r['return_pct'] for r in results):+.1f}%)")
        print(f"   Worst Year:              {min(results, key=lambda x: x['return_pct'])['year']} ({min(r['return_pct'] for r in results):+.1f}%)")
        print(f"   Total Trades:            {total_trades}")
        print(f"   Overall Win Rate:        {total_wins/total_trades*100:.1f}%")
        
        print(f"\n{'='*120}")
        if avg_return >= 50:
            print("🔥🔥🔥 EXCEPTIONAL SYSTEM!".center(120))
        elif avg_return >= 35:
            print("✅✅ STRONG SYSTEM!".center(120))
        elif avg_return >= 20:
            print("✅ DECENT SYSTEM".center(120))
        else:
            print("⚠️  NEEDS IMPROVEMENT".center(120))
        print(f"{'='*120}\n")
        
        # Save summary
        pd.DataFrame(results).to_csv(f'{self.output_dir}/yearly_summary.csv', index=False)
        
        print(f"\n💾 ALL RESULTS SAVED TO: {self.output_dir}/")
        print(f"   📊 Yearly summaries:     {self.output_dir}/yearly_summary.csv")
        print(f"   📈 Trade details:        {self.output_dir}/trades/")
        print(f"   🤖 ML training data:     {self.output_dir}/ml_data/")
        print(f"\n🤖 ML DATA READY FOR TRAINING!")
        print(f"   Each bar logged with 60+ features")
        print(f"   Executed trades + skipped signals with reasons")
        print(f"   Perfect for building predictive models\n")


def main():
    data_file = "NIFTY_1MIN_2015_2025.csv"
    
    if not os.path.exists(data_file):
        print(f"❌ File not found: {data_file}")
        return
    
    print(f"\n🔥 ULTIMATE ML-READY TRADING SYSTEM v17.0")
    print(f"{'='*60}")
    print(f"✅ Same proven logic that makes money")
    print(f"✅ Every trade shown in real-time")
    print(f"✅ Every bar logged for ML training")
    print(f"✅ Complete visibility + ML dataset")
    print(f"{'='*60}\n")
    
    trader = UltimateMLTrader(capital=100000)
    df = trader.load_data(data_file)
    
    if df is not None:
        results = trader.run_yearly_analysis(df)
    else:
        print("❌ Failed to load data")


if __name__ == "__main__":
    main()