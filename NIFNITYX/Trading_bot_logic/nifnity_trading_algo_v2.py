#!/usr/bin/env python3
"""
🔥 ULTIMATE MONEY PRINTER v14.0 - COMPLETE PROFESSIONAL TRADING SYSTEM
Professional-grade algorithmic trading system with:
1. Correct Risk Management (1% per trade max)
2. Multiple Strategy Engine
3. Dynamic Position Sizing
4. Market Regime Detection
5. ML-Ready Logging
6. Monthly/Yearly Reporting
7. Comprehensive Analytics

Target: 50%+ Annual Return | Max Drawdown: 15% | Capital: ₹100,000
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
import os
import json
import sys
from collections import defaultdict
import traceback
warnings.filterwarnings('ignore')

print("\n" + "="*120)
print("🔥 ULTIMATE MONEY PRINTER v14.0 - PROFESSIONAL TRADING SYSTEM".center(120))
print("CAPITAL: ₹100,000 | TARGET: 50%+ ANNUAL | MAX RISK: 1% PER TRADE".center(120))
print("="*120)

class UltimateMoneyPrinterPro:
    def __init__(self, capital=100000):
        # 💰 CAPITAL CONFIGURATION
        self.initial_capital = float(capital)
        self.capital = float(capital)
        self.peak_capital = float(capital)
        self.max_drawdown_allowed = 0.15  # 15% maximum drawdown
        
        # 📊 NIFTY TRADING PARAMETERS
        self.lot_size = 75
        self.point_value = 75
        self.margin_per_lot = 0.10  # 10% margin requirement
        
        # 🛡️ PROFESSIONAL RISK MANAGEMENT
        self.max_risk_per_trade = 0.01  # 1% maximum risk per trade
        self.max_daily_loss = 0.03  # 3% maximum daily loss
        self.max_daily_trades = 5  # Maximum 5 trades per day
        self.max_concurrent_trades = 2  # Maximum 2 open positions
        
        # 🎯 TARGETS & LIMITS
        self.daily_profit_target = 2000  # ₹2,000 daily target
        self.monthly_profit_target = 40000  # ₹40,000 monthly target
        self.min_stop_distance = 15  # Minimum 15 points stop
        self.max_stop_distance = 100  # Maximum 100 points stop
        
        # 🧠 MULTI-STRATEGY CONFIGURATION
        self.strategies = {
            'trend_following': {
                'weight': 0.35,
                'active': True,
                'risk_multiplier': 1.0,
                'trades': 0,
                'wins': 0,
                'pnl': 0
            },
            'mean_reversion': {
                'weight': 0.25,
                'active': True,
                'risk_multiplier': 0.8,
                'trades': 0,
                'wins': 0,
                'pnl': 0
            },
            'breakout': {
                'weight': 0.25,
                'active': True,
                'risk_multiplier': 1.2,
                'trades': 0,
                'wins': 0,
                'pnl': 0
            },
            'momentum': {
                'weight': 0.15,
                'active': True,
                'risk_multiplier': 1.0,
                'trades': 0,
                'wins': 0,
                'pnl': 0
            }
        }
        
        # 📈 PERFORMANCE TRACKING
        self.trades = []
        self.equity_curve = [capital]
        self.drawdown_curve = [0]
        self.max_drawdown = 0
        self.total_pnl = 0
        self.win_rate = 0
        
        # 📅 TIME-BASED TRACKING
        self.current_date = None
        self.current_month = None
        self.current_year = None
        self.daily_trades = 0
        self.daily_pnl = 0
        self.monthly_trades = 0
        self.monthly_pnl = 0
        self.yearly_trades = 0
        self.yearly_pnl = 0
        
        # 📊 MARKET REGIME DETECTION
        self.market_regime = "NEUTRAL"  # TRENDING/RANGING/VOLATILE/NEUTRAL
        self.volatility_regime = "NORMAL"  # LOW/NORMAL/HIGH
        self.trend_direction = "SIDEWAYS"  # UP/DOWN/SIDEWAYS
        
        # 📁 DATA COLLECTION FOR ML
        self.ml_trade_data = []
        self.monthly_logs = defaultdict(list)
        self.yearly_logs = defaultdict(list)
        
        # 📂 OUTPUT DIRECTORY STRUCTURE
        self.output_dir = "money_printer_pro"
        self.create_output_structure()
        
        # 🎯 TRADE SEQUENCE MANAGEMENT
        self.consecutive_losses = 0
        self.consecutive_wins = 0
        self.trading_enabled = True
        
        print(f"\n🔥 ULTIMATE MONEY PRINTER v14.0 INITIALIZED")
        print(f"💰 Capital: ₹{self.capital:,.0f}")
        print(f"🛡️  Max Risk/Trade: {self.max_risk_per_trade*100:.0f}% (₹{self.capital*self.max_risk_per_trade:,.0f})")
        print(f"🎯 Target: 50%+ Annual Return | Max DD: {self.max_drawdown_allowed*100:.0f}%")
        print(f"📊 Strategies Active: {sum(1 for s in self.strategies.values() if s['active'])}")
        print(f"📁 Output: {self.output_dir}/")
    
    def create_output_structure(self):
        """Create organized output directory structure"""
        directories = [
            self.output_dir,
            f"{self.output_dir}/trades",
            f"{self.output_dir}/monthly",
            f"{self.output_dir}/yearly",
            f"{self.output_dir}/ml_data",
            f"{self.output_dir}/reports",
            f"{self.output_dir}/equity"
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    def load_and_prepare_data(self, filepath):
        """Load and prepare market data with comprehensive indicators"""
        print(f"\n📊 LOADING AND PREPARING MARKET DATA...")
        
        try:
            # Load the data
            print(f"   Reading file: {filepath}")
            df = pd.read_csv(filepath, parse_dates=True)
            
            # Find datetime column
            datetime_column = None
            for col in df.columns:
                col_lower = str(col).lower()
                if 'date' in col_lower or 'time' in col_lower:
                    datetime_column = col
                    print(f"   Found datetime column: {datetime_column}")
                    break
            
            if datetime_column:
                df['datetime'] = pd.to_datetime(df[datetime_column])
                df.set_index('datetime', inplace=True)
            else:
                # Create datetime index if not found
                df['datetime'] = pd.date_range(
                    start='2020-01-01',
                    periods=len(df),
                    freq='1min'
                )
                df.set_index('datetime', inplace=True)
                print("   Created datetime index")
            
            # Filter for 2020-2025
            df = df.loc['2020-01-01':'2025-12-31'].copy()
            
            # Standardize column names
            column_mapping = {}
            for col in df.columns:
                col_lower = str(col).lower()
                if 'close' in col_lower or 'price' in col_lower or 'last' in col_lower:
                    column_mapping[col] = 'close'
                elif 'open' in col_lower:
                    column_mapping[col] = 'open'
                elif 'high' in col_lower:
                    column_mapping[col] = 'high'
                elif 'low' in col_lower:
                    column_mapping[col] = 'low'
                elif 'volume' in col_lower:
                    column_mapping[col] = 'volume'
            
            if column_mapping:
                df.rename(columns=column_mapping, inplace=True)
                print(f"   Standardized columns: {list(column_mapping.values())}")
            
            # Ensure we have OHLC data
            if 'close' not in df.columns and len(df.columns) > 0:
                df['close'] = df.iloc[:, 0]
                print("   Created 'close' column from first data column")
            
            if 'open' not in df.columns:
                df['open'] = df['close'].shift(1).fillna(df['close'])
                print("   Created 'open' column")
            
            if 'high' not in df.columns:
                df['high'] = df[['open', 'close']].max(axis=1)
                print("   Created 'high' column")
            
            if 'low' not in df.columns:
                df['low'] = df[['open', 'close']].min(axis=1)
                print("   Created 'low' column")
            
            print(f"✅ Raw data loaded: {len(df):,} rows")
            print(f"   Period: {df.index[0].date()} to {df.index[-1].date()}")
            print(f"   Columns: {list(df.columns)}")
            
            # Resample to 15-minute bars for optimal trading frequency
            print("🔁 Resampling to 15-minute bars...")
            df_resampled = df.resample('15T').agg({
                'open': 'first',
                'high': 'max',
                'low': 'min',
                'close': 'last'
            }).dropna()
            
            if 'volume' in df.columns:
                df_resampled['volume'] = df['volume'].resample('15T').sum()
            
            print(f"   Resampled to 15-min: {len(df_resampled):,} bars")
            
            # Calculate comprehensive indicators
            enhanced_df = self.calculate_all_indicators(df_resampled)
            
            # Detect initial market regime
            self.detect_market_regime(enhanced_df)
            
            print(f"✅ Data preparation complete")
            return enhanced_df
            
        except Exception as e:
            print(f"❌ ERROR loading data: {e}")
            traceback.print_exc()
            return None
    
    def calculate_all_indicators(self, df):
        """Calculate comprehensive technical indicators"""
        print("🧮 Calculating technical indicators...")
        
        df = df.copy()
        
        # 1. BASIC PRICE FEATURES
        df['returns'] = df['close'].pct_change()
        df['log_returns'] = np.log(df['close'] / df['close'].shift(1))
        df['high_low_range'] = df['high'] - df['low']
        df['close_open_range'] = df['close'] - df['open']
        df['body_size'] = abs(df['close'] - df['open'])
        df['upper_shadow'] = df['high'] - df[['open', 'close']].max(axis=1)
        df['lower_shadow'] = df[['open', 'close']].min(axis=1) - df['low']
        
        # 2. MOVING AVERAGES
        df['ema_9'] = df['close'].ewm(span=9, adjust=False).mean()
        df['ema_21'] = df['close'].ewm(span=21, adjust=False).mean()
        df['ema_50'] = df['close'].ewm(span=50, adjust=False).mean()
        df['ema_100'] = df['close'].ewm(span=100, adjust=False).mean()
        df['sma_20'] = df['close'].rolling(20).mean()
        df['sma_50'] = df['close'].rolling(50).mean()
        
        # 3. TREND INDICATORS
        df['ema_distance_pct'] = abs(df['ema_9'] - df['ema_21']) / df['close'] * 100
        df['ema_9_slope'] = df['ema_9'] - df['ema_9'].shift(5)
        df['ema_21_slope'] = df['ema_21'] - df['ema_21'].shift(10)
        df['price_vs_ema9'] = df['close'] / df['ema_9'] - 1
        df['price_vs_ema21'] = df['close'] / df['ema_21'] - 1
        df['price_vs_sma20'] = df['close'] / df['sma_20'] - 1
        
        # 4. MOMENTUM INDICATORS
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
        rs = gain / (loss + 0.0001)
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # MACD
        exp1 = df['close'].ewm(span=12, adjust=False).mean()
        exp2 = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = exp1 - exp2
        df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
        df['macd_hist'] = df['macd'] - df['macd_signal']
        
        # Stochastic
        low_14 = df['low'].rolling(14).min()
        high_14 = df['high'].rolling(14).max()
        df['stoch_k'] = 100 * ((df['close'] - low_14) / (high_14 - low_14))
        df['stoch_d'] = df['stoch_k'].rolling(3).mean()
        
        # 5. VOLATILITY INDICATORS
        # ATR
        high_low = df['high'] - df['low']
        high_close = abs(df['high'] - df['close'].shift())
        low_close = abs(df['low'] - df['close'].shift())
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        df['atr'] = true_range.rolling(14).mean()
        df['atr_pct'] = df['atr'] / df['close'] * 100
        
        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(20).mean()
        bb_std = df['close'].rolling(20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'] + 0.0001)
        
        # 6. SUPPORT/RESISTANCE
        df['resistance_20'] = df['high'].rolling(20).max()
        df['support_20'] = df['low'].rolling(20).min()
        df['resistance_50'] = df['high'].rolling(50).max()
        df['support_50'] = df['low'].rolling(50).min()
        
        # Pivot Points
        df['pivot'] = (df['high'] + df['low'] + df['close']) / 3
        df['pivot_r1'] = 2 * df['pivot'] - df['low']
        df['pivot_s1'] = 2 * df['pivot'] - df['high']
        
        # 7. VOLUME ANALYSIS (if available)
        if 'volume' in df.columns:
            df['volume_sma_20'] = df['volume'].rolling(20).mean()
            df['volume_ratio'] = df['volume'] / (df['volume_sma_20'] + 0.0001)
        
        # 8. TIME FEATURES
        df['hour'] = df.index.hour
        df['minute'] = df.index.minute
        df['day_of_week'] = df.index.dayofweek
        df['day_of_month'] = df.index.day
        df['month'] = df.index.month
        df['year'] = df.index.year
        
        # Trading session flags
        df['is_opening_hour'] = ((df['hour'] == 9) & (df['minute'] <= 45)).astype(int)
        df['is_closing_hour'] = ((df['hour'] == 15) & (df['minute'] >= 15)).astype(int)
        df['is_midday'] = ((df['hour'] >= 11) & (df['hour'] <= 13)).astype(int)
        
        # 9. MARKET STRUCTURE
        df['higher_high'] = (df['high'] > df['high'].shift(1)).astype(int)
        df['lower_low'] = (df['low'] < df['low'].shift(1)).astype(int)
        df['inside_bar'] = ((df['high'] < df['high'].shift(1)) & 
                           (df['low'] > df['low'].shift(1))).astype(int)
        df['outside_bar'] = ((df['high'] > df['high'].shift(1)) & 
                            (df['low'] < df['low'].shift(1))).astype(int)
        
        # 10. TREND STRENGTH
        df['adx'] = self.calculate_adx(df, 14)
        df['trend_strength'] = df['adx'] / 100
        
        # Fill NaN values
        df = df.fillna(method='ffill').fillna(method='bfill')
        
        print(f"✅ Calculated {len(df.columns)} technical indicators")
        return df
    
    def calculate_adx(self, df, period=14):
        """Calculate Average Directional Index"""
        high = df['high']
        low = df['low']
        
        # Calculate +DM and -DM
        up_move = high.diff()
        down_move = low.diff().abs()
        
        plus_dm = up_move.where((up_move > down_move) & (up_move > 0), 0)
        minus_dm = down_move.where((down_move > up_move) & (down_move > 0), 0)
        
        # Calculate True Range
        tr1 = high - low
        tr2 = abs(high - df['close'].shift())
        tr3 = abs(low - df['close'].shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        atr = tr.rolling(period).mean()
        
        # Calculate +DI and -DI
        plus_di = 100 * (plus_dm.rolling(period).mean() / atr)
        minus_di = 100 * (minus_dm.rolling(period).mean() / atr)
        
        # Calculate DX and ADX
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 0.0001)
        adx = dx.rolling(period).mean()
        
        return adx.fillna(25)
    
    def detect_market_regime(self, df, idx=-1):
        """Detect current market regime"""
        if idx < 50 or idx >= len(df):
            return
        
        row = df.iloc[idx]
        
        # Get key metrics
        adx = row['adx']
        bb_width = row['bb_width']
        atr_pct = row['atr_pct']
        ema_distance = row['ema_distance_pct']
        
        # Detect trend
        if adx > 30:
            if row['ema_9'] > row['ema_21']:
                self.trend_direction = "UP"
                self.market_regime = "TRENDING"
            else:
                self.trend_direction = "DOWN"
                self.market_regime = "TRENDING"
        elif adx < 20 and bb_width < df['bb_width'].rolling(50).mean().iloc[idx] * 0.7:
            self.market_regime = "RANGING"
            self.trend_direction = "SIDEWAYS"
        else:
            self.market_regime = "NEUTRAL"
        
        # Detect volatility
        if atr_pct > 0.4:
            self.volatility_regime = "HIGH"
        elif atr_pct < 0.15:
            self.volatility_regime = "LOW"
        else:
            self.volatility_regime = "NORMAL"
        
        return self.market_regime, self.volatility_regime, self.trend_direction
    
    def check_trading_conditions(self, timestamp, df, idx):
        """Check if trading conditions are favorable"""
        # Update time-based tracking
        current_date = timestamp.date()
        current_month = timestamp.strftime('%Y-%m')
        current_year = timestamp.year
        
        # Reset daily counters
        if self.current_date != current_date:
            self.current_date = current_date
            self.daily_trades = 0
            self.daily_pnl = 0
            
            # Reset consecutive streaks at new day
            if self.consecutive_losses > 0:
                self.consecutive_losses = 0
                self.trading_enabled = True
        
        # Reset monthly counters
        if self.current_month != current_month:
            self.current_month = current_month
            self.monthly_trades = 0
            self.monthly_pnl = 0
        
        # Reset yearly counters
        if self.current_year != current_year:
            self.current_year = current_year
            self.yearly_trades = 0
            self.yearly_pnl = 0
        
        # Check daily loss limit
        if self.daily_pnl < -self.initial_capital * self.max_daily_loss:
            if self.daily_trades > 0:
                print(f"   ⏸️ Daily loss limit reached: ₹{self.daily_pnl:,.0f}")
            return False
        
        # Check daily trade limit
        if self.daily_trades >= self.max_daily_trades:
            return False
        
        # Check trading hours (avoid first/last 45 minutes)
        hour, minute = timestamp.hour, timestamp.minute
        if (hour == 9 and minute < 45) or (hour == 15 and minute > 45):
            return False
        
        # Check market open hours
        if hour < 9 or hour > 15:
            return False
        
        # Check consecutive losses
        if self.consecutive_losses >= 3:
            print(f"   ⚠️  3 consecutive losses - pausing trading")
            self.trading_enabled = False
            return False
        
        # Check drawdown
        if not self.update_drawdown():
            return False
        
        # Check volatility
        if idx < 50:
            return False
        
        row = df.iloc[idx]
        if row['atr_pct'] > 0.5:  # Too high volatility
            return False
        
        return True
    
    def update_drawdown(self):
        """Update and check drawdown"""
        if self.capital > self.peak_capital:
            self.peak_capital = self.capital
        
        current_dd = (self.peak_capital - self.capital) / self.peak_capital
        
        if current_dd > self.max_drawdown:
            self.max_drawdown = current_dd
        
        self.drawdown_curve.append(current_dd)
        
        # Emergency stop if drawdown too high
        if current_dd > self.max_drawdown_allowed:
            print(f"🚨 EMERGENCY STOP: Drawdown {current_dd*100:.1f}% > {self.max_drawdown_allowed*100:.0f}%")
            self.trading_enabled = False
            return False
        
        # Reduce risk if drawdown is high
        if current_dd > self.max_drawdown_allowed * 0.7:
            print(f"   ⚠️  High drawdown: {current_dd*100:.1f}% - Reducing risk")
            for strategy in self.strategies.values():
                strategy['risk_multiplier'] = 0.5
        
        return True
    
    def generate_trading_signals(self, df, idx):
        """Generate trading signals from all strategies"""
        if idx < 100:
            return []
        
        row = df.iloc[idx]
        signals = []
        
        # Detect current market regime
        self.detect_market_regime(df, idx)
        
        # 1. TREND FOLLOWING STRATEGY
        if self.strategies['trend_following']['active']:
            trend_signal = self.trend_following_signal(row, df, idx)
            if trend_signal:
                trend_signal['strategy'] = 'trend_following'
                trend_signal['weight'] = self.strategies['trend_following']['weight']
                signals.append(trend_signal)
        
        # 2. MEAN REVERSION STRATEGY
        if self.strategies['mean_reversion']['active']:
            reversion_signal = self.mean_reversion_signal(row, df, idx)
            if reversion_signal:
                reversion_signal['strategy'] = 'mean_reversion'
                reversion_signal['weight'] = self.strategies['mean_reversion']['weight']
                signals.append(reversion_signal)
        
        # 3. BREAKOUT STRATEGY
        if self.strategies['breakout']['active']:
            breakout_signal = self.breakout_signal(row, df, idx)
            if breakout_signal:
                breakout_signal['strategy'] = 'breakout'
                breakout_signal['weight'] = self.strategies['breakout']['weight']
                signals.append(breakout_signal)
        
        # 4. MOMENTUM STRATEGY
        if self.strategies['momentum']['active']:
            momentum_signal = self.momentum_signal(row, df, idx)
            if momentum_signal:
                momentum_signal['strategy'] = 'momentum'
                momentum_signal['weight'] = self.strategies['momentum']['weight']
                signals.append(momentum_signal)
        
        return signals
    
    def trend_following_signal(self, row, df, idx):
        """Trend following strategy - follow the trend"""
        # Check for strong trend
        if row['adx'] < 25:
            return None
        
        # Check EMA alignment
        ema_bullish = row['ema_9'] > row['ema_21'] > row['ema_50']
        ema_bearish = row['ema_9'] < row['ema_21'] < row['ema_50']
        
        # Check for pullback in trend
        if ema_bullish and self.market_regime in ["TRENDING", "NEUTRAL"]:
            # Buy on pullback to EMA 21
            if row['close'] < row['ema_21'] and row['rsi'] < 60:
                return {
                    'action': 'BUY',
                    'price': row['close'],
                    'stop_loss': min(row['ema_50'], row['support_20']),
                    'take_profit': row['close'] * 1.025,
                    'risk_reward': 2.5,
                    'confidence': 0.8,
                    'market_regime': self.market_regime,
                    'volatility_regime': self.volatility_regime
                }
        
        elif ema_bearish and self.market_regime in ["TRENDING", "NEUTRAL"]:
            # Sell on bounce to EMA 21
            if row['close'] > row['ema_21'] and row['rsi'] > 40:
                return {
                    'action': 'SELL',
                    'price': row['close'],
                    'stop_loss': max(row['ema_50'], row['resistance_20']),
                    'take_profit': row['close'] * 0.975,
                    'risk_reward': 2.5,
                    'confidence': 0.8,
                    'market_regime': self.market_regime,
                    'volatility_regime': self.volatility_regime
                }
        
        return None
    
    def mean_reversion_signal(self, row, df, idx):
        """Mean reversion strategy - fade extremes"""
        # Only trade in ranging markets
        if self.market_regime != "RANGING":
            return None
        
        # Check for overbought/oversold conditions
        if row['rsi'] < 30 and row['bb_position'] < 0.2:
            # Buy oversold bounce
            return {
                'action': 'BUY',
                'price': row['close'],
                'stop_loss': row['close'] * 0.99,
                'take_profit': row['bb_middle'],
                'risk_reward': 1.5,
                'confidence': 0.7,
                'market_regime': self.market_regime,
                'volatility_regime': self.volatility_regime
            }
        
        elif row['rsi'] > 70 and row['bb_position'] > 0.8:
            # Sell overbought fade
            return {
                'action': 'SELL',
                'price': row['close'],
                'stop_loss': row['close'] * 1.01,
                'take_profit': row['bb_middle'],
                'risk_reward': 1.5,
                'confidence': 0.7,
                'market_regime': self.market_regime,
                'volatility_regime': self.volatility_regime
            }
        
        return None
    
    def breakout_signal(self, row, df, idx):
        """Breakout strategy - trade breakouts from consolidation"""
        # Need at least 20 bars of history
        if idx < 20:
            return None
        
        # Find recent consolidation range
        recent_high = df['high'].iloc[idx-20:idx].max()
        recent_low = df['low'].iloc[idx-20:idx].min()
        consolidation_range = (recent_high - recent_low) / recent_low
        
        # Too wide range means not consolidated
        if consolidation_range > 0.02:
            return None
        
        # Check for breakout
        if row['close'] > recent_high and row['volume_ratio'] > 1.5 if 'volume_ratio' in row else True:
            # Breakout above resistance
            return {
                'action': 'BUY',
                'price': row['close'],
                'stop_loss': recent_low,
                'take_profit': row['close'] + (row['close'] - recent_low) * 1.5,
                'risk_reward': 3.0,
                'confidence': 0.75,
                'market_regime': self.market_regime,
                'volatility_regime': self.volatility_regime
            }
        
        # Check for breakdown
        elif row['close'] < recent_low:
            # Breakdown below support
            return {
                'action': 'SELL',
                'price': row['close'],
                'stop_loss': recent_high,
                'take_profit': row['close'] - (recent_high - row['close']) * 1.5,
                'risk_reward': 3.0,
                'confidence': 0.75,
                'market_regime': self.market_regime,
                'volatility_regime': self.volatility_regime
            }
        
        return None
    
    def momentum_signal(self, row, df, idx):
        """Momentum strategy - follow strong momentum moves"""
        # Need at least 10 bars for momentum calculation
        if idx < 10:
            return None
        
        # Calculate momentum
        momentum_10 = (row['close'] / df['close'].iloc[idx-10] - 1) * 100
        
        # Strong upward momentum
        if momentum_10 > 2 and row['rsi'] > 50 and row['rsi'] < 70:
            return {
                'action': 'BUY',
                'price': row['close'],
                'stop_loss': row['close'] * 0.985,
                'take_profit': row['close'] * 1.02,
                'risk_reward': 2.0,
                'confidence': 0.65,
                'market_regime': self.market_regime,
                'volatility_regime': self.volatility_regime
            }
        
        # Strong downward momentum
        elif momentum_10 < -2 and row['rsi'] < 50 and row['rsi'] > 30:
            return {
                'action': 'SELL',
                'price': row['close'],
                'stop_loss': row['close'] * 1.015,
                'take_profit': row['close'] * 0.98,
                'risk_reward': 2.0,
                'confidence': 0.65,
                'market_regime': self.market_regime,
                'volatility_regime': self.volatility_regime
            }
        
        return None
    
    def calculate_position_size(self, signal):
        """Calculate position size with CORRECT risk management"""
        entry_price = signal['price']
        stop_loss = signal['stop_loss']
        
        # Calculate stop distance in points
        stop_distance = abs(entry_price - stop_loss)
        
        # Validate stop distance
        if stop_distance < self.min_stop_distance:
            stop_distance = self.min_stop_distance
        if stop_distance > self.max_stop_distance:
            return None  # Stop too wide, skip trade
        
        # **CORRECT RISK CALCULATION**
        # Get strategy risk multiplier
        strategy = self.strategies[signal['strategy']]
        risk_multiplier = strategy['risk_multiplier']
        
        # Adjust for market regime
        if self.volatility_regime == "HIGH":
            risk_multiplier *= 0.7
        elif self.volatility_regime == "LOW":
            risk_multiplier *= 1.2
        
        # Adjust for consecutive losses
        if self.consecutive_losses >= 1:
            risk_multiplier *= 0.5
        
        # Calculate maximum risk amount
        max_risk_amount = self.capital * self.max_risk_per_trade * risk_multiplier
        
        # Calculate risk per point
        risk_per_point = self.point_value  # ₹75 per point
        
        # Calculate maximum lots based on risk
        max_lots_by_risk = int(max_risk_amount / (stop_distance * risk_per_point))
        
        if max_lots_by_risk < 1:
            return None  # Risk too high for even 1 lot
        
        # Calculate maximum lots based on capital (margin)
        margin_per_lot = entry_price * self.lot_size * self.margin_per_lot
        max_lots_by_capital = int(self.capital / margin_per_lot)
        
        # Take minimum of both constraints
        lots = min(max_lots_by_risk, max_lots_by_capital, 5)  # Max 5 lots
        lots = max(1, lots)  # Minimum 1 lot
        
        # Calculate actual risk
        actual_risk = lots * stop_distance * risk_per_point
        actual_risk_pct = (actual_risk / self.capital) * 100
        
        # Verify risk is within limits
        if actual_risk_pct > self.max_risk_per_trade * 100 * 1.1:  # 10% tolerance
            print(f"   ⚠️  Risk too high: {actual_risk_pct:.1f}% - Adjusting lots")
            lots = max(1, int((self.capital * self.max_risk_per_trade) / (stop_distance * risk_per_point)))
            actual_risk = lots * stop_distance * risk_per_point
            actual_risk_pct = (actual_risk / self.capital) * 100
        
        return {
            'lots': lots,
            'quantity': lots * self.lot_size,
            'stop_distance': stop_distance,
            'risk_amount': actual_risk,
            'risk_pct': actual_risk_pct,
            'risk_multiplier': risk_multiplier,
            'margin_used': lots * margin_per_lot
        }
    
    def execute_trade(self, signal, position, timestamp, idx, df):
        """Execute a trade with comprehensive logging"""
        trade_id = len(self.trades) + 1
        
        # Create trade record
        trade = {
            # Basic trade info
            'trade_id': trade_id,
            'timestamp': timestamp,
            'strategy': signal['strategy'],
            'action': signal['action'],
            'price': signal['price'],
            'lots': position['lots'],
            'quantity': position['quantity'],
            
            # Risk management
            'stop_loss': signal['stop_loss'],
            'take_profit': signal['take_profit'],
            'risk_amount': position['risk_amount'],
            'risk_pct': position['risk_pct'],
            'risk_reward': signal['risk_reward'],
            'risk_multiplier': position['risk_multiplier'],
            
            # Market context
            'market_regime': signal['market_regime'],
            'volatility_regime': signal['volatility_regime'],
            'confidence': signal['confidence'],
            
            # Status tracking
            'status': 'OPEN',
            'entry_idx': idx,
            
            # Exit info (to be filled later)
            'exit_price': None,
            'exit_time': None,
            'exit_reason': None,
            'pnl': None,
            'pnl_points': None,
            'pnl_percent': None,
            'duration_bars': None,
            'duration_minutes': None,
            
            # Market data at entry (for ML)
            'entry_data': self.extract_market_data(df, idx)
        }
        
        self.trades.append(trade)
        self.daily_trades += 1
        self.monthly_trades += 1
        self.yearly_trades += 1
        
        # Update strategy stats
        strategy = self.strategies[signal['strategy']]
        strategy['trades'] += 1
        
        # Add to monthly and yearly logs
        month_key = timestamp.strftime('%Y-%m')
        year_key = str(timestamp.year)
        
        self.monthly_logs[month_key].append({
            'trade_id': trade_id,
            'timestamp': timestamp,
            'action': signal['action'],
            'price': signal['price'],
            'strategy': signal['strategy'],
            'lots': position['lots'],
            'status': 'OPEN'
        })
        
        self.yearly_logs[year_key].append({
            'trade_id': trade_id,
            'timestamp': timestamp,
            'action': signal['action'],
            'strategy': signal['strategy'],
            'status': 'OPEN'
        })
        
        # Print trade execution
        print(f"\n🎯 TRADE #{trade_id} [{signal['strategy'].upper()}]")
        print(f"   {signal['action']} {position['lots']} lots @ ₹{signal['price']:.2f}")
        print(f"   Stop: ₹{signal['stop_loss']:.2f} | Target: ₹{signal['take_profit']:.2f}")
        print(f"   Risk: ₹{position['risk_amount']:,.0f} ({position['risk_pct']:.1f}%) | R:R: 1:{signal['risk_reward']}")
        print(f"   Regime: {signal['market_regime']} | Confidence: {signal['confidence']:.2f}")
        print(f"   Capital: ₹{self.capital:,.0f} | DD: {self.max_drawdown*100:.1f}%")
        
        return trade
    
    def extract_market_data(self, df, idx):
        """Extract market data for ML logging"""
        if idx >= len(df):
            return {}
        
        row = df.iloc[idx]
        
        return {
            'price': float(row['close']),
            'rsi': float(row['rsi']),
            'macd': float(row['macd']),
            'atr_pct': float(row['atr_pct']),
            'bb_position': float(row['bb_position']),
            'ema_distance': float(row['ema_distance_pct']),
            'trend_strength': float(row['trend_strength']),
            'hour': int(row['hour']),
            'day_of_week': int(row['day_of_week'])
        }
    
    def manage_open_trades(self, df, idx):
        """Manage all open trades"""
        current_price = df['close'].iloc[idx]
        timestamp = df.index[idx]
        
        for trade in [t for t in self.trades if t['status'] == 'OPEN']:
            # Calculate current P&L
            if trade['action'] == 'BUY':
                pnl_pts = current_price - trade['price']
                # Check exit conditions
                if current_price <= trade['stop_loss']:
                    exit_price = trade['stop_loss']
                    exit_reason = 'STOP_LOSS'
                elif current_price >= trade['take_profit']:
                    exit_price = trade['take_profit']
                    exit_reason = 'TAKE_PROFIT'
                else:
                    # Check trailing stop (for profitable trades)
                    if pnl_pts > trade.get('stop_distance', 20) * 0.5:
                        new_stop = trade['price'] + trade.get('stop_distance', 20) * 0.5
                        if new_stop > trade['stop_loss']:
                            trade['stop_loss'] = new_stop
                    continue
            else:  # SELL
                pnl_pts = trade['price'] - current_price
                # Check exit conditions
                if current_price >= trade['stop_loss']:
                    exit_price = trade['stop_loss']
                    exit_reason = 'STOP_LOSS'
                elif current_price <= trade['take_profit']:
                    exit_price = trade['take_profit']
                    exit_reason = 'TAKE_PROFIT'
                else:
                    # Check trailing stop
                    if pnl_pts > trade.get('stop_distance', 20) * 0.5:
                        new_stop = trade['price'] - trade.get('stop_distance', 20) * 0.5
                        if new_stop < trade['stop_loss']:
                            trade['stop_loss'] = new_stop
                    continue
            
            # Close the trade
            self.close_trade(trade, exit_price, timestamp, exit_reason, idx, df)
        
        return True
    
    def close_trade(self, trade, exit_price, timestamp, exit_reason, idx, df):
        """Close a trade and update all records"""
        # Calculate P&L
        if trade['action'] == 'BUY':
            pnl_pts = exit_price - trade['price']
        else:
            pnl_pts = trade['price'] - exit_price
        
        pnl = pnl_pts * trade['lots'] * self.point_value
        pnl_percent = (pnl / (trade['price'] * trade['quantity'])) * 100 if trade['price'] * trade['quantity'] > 0 else 0
        
        # Calculate duration
        entry_time = trade['timestamp']
        duration = timestamp - entry_time
        duration_minutes = duration.total_seconds() / 60
        duration_bars = idx - trade['entry_idx']
        
        # Update capital and tracking
        self.capital += pnl
        self.daily_pnl += pnl
        self.monthly_pnl += pnl
        self.yearly_pnl += pnl
        self.total_pnl += pnl
        self.equity_curve.append(self.capital)
        
        # Update trade record
        trade['exit_price'] = exit_price
        trade['exit_time'] = timestamp
        trade['exit_reason'] = exit_reason
        trade['pnl'] = pnl
        trade['pnl_points'] = pnl_pts
        trade['pnl_percent'] = pnl_percent
        trade['duration_bars'] = duration_bars
        trade['duration_minutes'] = duration_minutes
        trade['status'] = 'CLOSED'
        
        # Add exit market data
        trade['exit_data'] = self.extract_market_data(df, idx)
        
        # Update strategy performance
        strategy = self.strategies[trade['strategy']]
        strategy['pnl'] += pnl
        if pnl > 0:
            strategy['wins'] += 1
            self.consecutive_wins += 1
            self.consecutive_losses = 0
        else:
            self.consecutive_wins = 0
            self.consecutive_losses += 1
        
        # Update monthly and yearly logs
        month_key = timestamp.strftime('%Y-%m')
        year_key = str(timestamp.year)
        
        for log_entry in self.monthly_logs[month_key]:
            if log_entry['trade_id'] == trade['trade_id']:
                log_entry.update({
                    'exit_price': exit_price,
                    'exit_time': timestamp,
                    'exit_reason': exit_reason,
                    'pnl': pnl,
                    'status': 'CLOSED'
                })
                break
        
        for log_entry in self.yearly_logs[year_key]:
            if log_entry['trade_id'] == trade['trade_id']:
                log_entry.update({
                    'exit_price': exit_price,
                    'pnl': pnl,
                    'status': 'CLOSED'
                })
                break
        
        # Create ML data record
        ml_record = self.create_ml_record(trade)
        self.ml_trade_data.append(ml_record)
        
        # Print trade result
        color = "🟢" if pnl > 0 else "🔴"
        print(f"\n{color} TRADE #{trade['trade_id']} CLOSED")
        print(f"   Exit: ₹{exit_price:.2f} | Reason: {exit_reason}")
        print(f"   P&L: ₹{pnl:+,.0f} ({pnl_percent:+.2f}%) | Points: {pnl_pts:+.1f}")
        print(f"   Duration: {duration_minutes:.0f} min ({duration_bars} bars)")
        print(f"   Capital: ₹{self.capital:,.0f}")
        print(f"   Win Streak: {self.consecutive_wins} | Loss Streak: {self.consecutive_losses}")
        
        # Update drawdown
        self.update_drawdown()
    
    def create_ml_record(self, trade):
        """Create ML training record from trade"""
        return {
            'trade_id': trade['trade_id'],
            'strategy': trade['strategy'],
            'action': trade['action'],
            'entry_price': trade['price'],
            'exit_price': trade['exit_price'],
            'pnl': trade['pnl'],
            'pnl_points': trade['pnl_points'],
            'pnl_percent': trade['pnl_percent'],
            'duration_minutes': trade['duration_minutes'],
            'exit_reason': trade['exit_reason'],
            'risk_pct': trade['risk_pct'],
            'risk_reward': trade['risk_reward'],
            'market_regime': trade['market_regime'],
            'volatility_regime': trade['volatility_regime'],
            'confidence': trade['confidence'],
            'entry_data': trade['entry_data'],
            'exit_data': trade['exit_data']
        }
    
    def adapt_strategy_weights(self):
        """Adapt strategy weights based on performance"""
        print(f"\n🔄 ADAPTING STRATEGY WEIGHTS...")
        
        performance_data = []
        total_performance = 0
        
        for strat_name, strat_data in self.strategies.items():
            if strat_data['trades'] > 5:  # Need minimum trades
                win_rate = strat_data['wins'] / strat_data['trades'] if strat_data['trades'] > 0 else 0
                avg_trade = strat_data['pnl'] / strat_data['trades'] if strat_data['trades'] > 0 else 0
                
                # Performance score (weighted combination)
                performance_score = (win_rate * 100) + (avg_trade / 100)
                performance_data.append({
                    'strategy': strat_name,
                    'score': max(performance_score, 0.1),  # Minimum 0.1
                    'win_rate': win_rate,
                    'avg_trade': avg_trade,
                    'trades': strat_data['trades']
                })
                total_performance += max(performance_score, 0.1)
        
        if performance_data and total_performance > 0:
            # Adjust weights based on performance
            for perf in performance_data:
                target_weight = perf['score'] / total_performance
                current_weight = self.strategies[perf['strategy']]['weight']
                
                # Smooth adjustment (30% towards target)
                new_weight = current_weight * 0.7 + target_weight * 0.3
                self.strategies[perf['strategy']]['weight'] = max(0.1, min(0.5, new_weight))
            
            # Normalize weights
            total_weight = sum(s['weight'] for s in self.strategies.values())
            for strat_name in self.strategies:
                self.strategies[strat_name]['weight'] /= total_weight
            
            # Print updated weights
            print(f"   Updated Strategy Weights:")
            for perf in performance_data:
                strat = perf['strategy']
                weight = self.strategies[strat]['weight'] * 100
                win_rate = perf['win_rate'] * 100
                avg_trade = perf['avg_trade']
                print(f"   {strat:15s}: {weight:5.1f}% | WR: {win_rate:5.1f}% | Avg: ₹{avg_trade:+,.0f}")
    
    def run_comprehensive_backtest(self, df):
        """Run comprehensive backtest"""
        print(f"\n🚀 STARTING COMPREHENSIVE BACKTEST")
        print(f"   Total bars: {len(df):,}")
        print(f"   Trading period: {df.index[0].date()} to {df.index[-1].date()}")
        print(f"   Expected trading days: ~{len(df)/26:.0f}")
        
        start_time = datetime.now()
        last_progress_update = 0
        progress_interval = max(1, len(df) // 20)  # 5% intervals
        
        try:
            for idx in range(100, len(df) - 10):
                timestamp = df.index[idx]
                
                # Check trading conditions
                if not self.check_trading_conditions(timestamp, df, idx):
                    continue
                
                # Manage existing trades
                self.manage_open_trades(df, idx)
                
                # Check if trading is enabled
                if not self.trading_enabled:
                    continue
                
                # Check concurrent trades limit
                open_trades = len([t for t in self.trades if t['status'] == 'OPEN'])
                if open_trades >= self.max_concurrent_trades:
                    continue
                
                # Generate trading signals
                signals = self.generate_trading_signals(df, idx)
                
                # Execute best signal (if any)
                if signals:
                    # Sort by confidence
                    signals.sort(key=lambda x: x['confidence'], reverse=True)
                    best_signal = signals[0]
                    
                    # Calculate position size
                    position = self.calculate_position_size(best_signal)
                    
                    if position:
                        # Execute trade
                        self.execute_trade(best_signal, position, timestamp, idx, df)
                
                # Adapt strategy weights periodically
                closed_trades = len([t for t in self.trades if t['status'] == 'CLOSED'])
                if closed_trades > 0 and closed_trades % 25 == 0:
                    self.adapt_strategy_weights()
                
                # Progress update
                current_progress = idx / len(df) * 100
                if current_progress - last_progress_update >= 5:
                    self.show_progress_update(idx, len(df), start_time)
                    last_progress_update = current_progress
            
            # Close any remaining open trades
            self.close_all_trades(df)
            
            # Generate final reports
            self.generate_final_reports()
            
            # Save all data
            self.save_all_data()
            
            print(f"\n✅ BACKTEST COMPLETED SUCCESSFULLY!")
            
        except Exception as e:
            print(f"\n❌ ERROR during backtest: {e}")
            traceback.print_exc()
    
    def show_progress_update(self, current_idx, total_bars, start_time):
        """Show progress update"""
        progress = current_idx / total_bars * 100
        elapsed = (datetime.now() - start_time).total_seconds() / 60
        
        closed_trades = [t for t in self.trades if t['status'] == 'CLOSED']
        total_pnl = sum(t['pnl'] for t in closed_trades)
        winning_trades = len([t for t in closed_trades if t['pnl'] > 0])
        win_rate = winning_trades / len(closed_trades) * 100 if closed_trades else 0
        
        print(f"\n📊 PROGRESS: {progress:.1f}% | Elapsed: {elapsed:.1f} min")
        print(f"   Trades: {len(closed_trades)} | Win Rate: {win_rate:.1f}%")
        print(f"   Total P&L: ₹{total_pnl:+,.0f} | Capital: ₹{self.capital:,.0f}")
        print(f"   Max Drawdown: {self.max_drawdown*100:.1f}%")
        print(f"   Daily P&L: ₹{self.daily_pnl:+,.0f} | Monthly P&L: ₹{self.monthly_pnl:+,.0f}")
    
    def close_all_trades(self, df):
        """Close all remaining open trades"""
        if len(df) == 0:
            return
        
        last_price = df['close'].iloc[-1]
        last_time = df.index[-1]
        
        for trade in [t for t in self.trades if t['status'] == 'OPEN']:
            self.close_trade(trade, last_price, last_time, 'FORCE_CLOSE', len(df)-1, df)
    
    def generate_final_reports(self):
        """Generate comprehensive final reports"""
        print(f"\n{'='*120}")
        print("🔥 FINAL PERFORMANCE REPORT - ULTIMATE MONEY PRINTER v14.0".center(120))
        print(f"{'='*120}")
        
        closed_trades = [t for t in self.trades if t['status'] == 'CLOSED']
        
        if not closed_trades:
            print("❌ No trades were executed!")
            return
        
        # Calculate all statistics
        stats = self.calculate_statistics(closed_trades)
        
        # Print comprehensive report
        self.print_performance_report(stats)
        
        # Print strategy performance
        self.print_strategy_performance()
        
        # Print monthly performance
        self.print_monthly_performance()
        
        # Print risk metrics
        self.print_risk_metrics(closed_trades)
        
        # Performance assessment
        self.assess_performance(stats)
    
    def calculate_statistics(self, closed_trades):
        """Calculate comprehensive statistics"""
        total_trades = len(closed_trades)
        winning_trades = [t for t in closed_trades if t['pnl'] > 0]
        losing_trades = [t for t in closed_trades if t['pnl'] <= 0]
        
        total_pnl = sum(t['pnl'] for t in closed_trades)
        total_return = (self.capital / self.initial_capital - 1) * 100
        
        win_rate = len(winning_trades) / total_trades * 100 if total_trades > 0 else 0
        avg_win = np.mean([t['pnl'] for t in winning_trades]) if winning_trades else 0
        avg_loss = np.mean([t['pnl'] for t in losing_trades]) if losing_trades else 0
        
        # Annual return (6 years: 2020-2025)
        years = 6
        annual_return = ((self.capital / self.initial_capital) ** (1/years) - 1) * 100
        
        # Profit factor
        gross_profit = sum(t['pnl'] for t in winning_trades)
        gross_loss = abs(sum(t['pnl'] for t in losing_trades))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
        
        # Average risk per trade
        avg_risk = np.mean([t['risk_pct'] for t in closed_trades])
        
        # Largest win/loss
        largest_win = max([t['pnl'] for t in winning_trades]) if winning_trades else 0
        largest_loss = min([t['pnl'] for t in losing_trades]) if losing_trades else 0
        
        # Average trade duration
        avg_duration = np.mean([t['duration_minutes'] for t in closed_trades])
        
        # Sharpe ratio (simplified)
        returns = pd.Series([t['pnl_percent']/100 for t in closed_trades])
        sharpe = returns.mean() / returns.std() * np.sqrt(252) if len(returns) > 1 and returns.std() > 0 else 0
        
        return {
            'total_trades': total_trades,
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'win_rate': win_rate,
            'total_pnl': total_pnl,
            'total_return': total_return,
            'annual_return': annual_return,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'profit_factor': profit_factor,
            'avg_risk': avg_risk,
            'largest_win': largest_win,
            'largest_loss': largest_loss,
            'avg_duration': avg_duration,
            'sharpe': sharpe,
            'max_drawdown': self.max_drawdown * 100,
            'final_capital': self.capital,
            'initial_capital': self.initial_capital
        }
    
    def print_performance_report(self, stats):
        """Print performance report"""
        print(f"\n📈 CORE PERFORMANCE METRICS:")
        print(f"   Initial Capital:    ₹{self.initial_capital:,.0f}")
        print(f"   Final Capital:      ₹{self.capital:,.0f}")
        print(f"   Total P&L:          ₹{stats['total_pnl']:+,.0f}")
        print(f"   Total Return:       {stats['total_return']:+.2f}%")
        print(f"   Annual Return:      {stats['annual_return']:+.2f}%")
        print(f"   Max Drawdown:       {stats['max_drawdown']:.2f}%")
        
        print(f"\n🎯 TRADE STATISTICS:")
        print(f"   Total Trades:       {stats['total_trades']}")
        print(f"   Winning Trades:     {stats['winning_trades']} ({stats['win_rate']:.1f}%)")
        print(f"   Losing Trades:      {stats['losing_trades']}")
        print(f"   Profit Factor:      {stats['profit_factor']:.2f}")
        print(f"   Avg Win:            ₹{stats['avg_win']:+,.0f}")
        print(f"   Avg Loss:           ₹{stats['avg_loss']:+,.0f}")
        
        if stats['avg_loss'] != 0:
            win_loss_ratio = abs(stats['avg_win'] / stats['avg_loss'])
            print(f"   Win/Loss Ratio:     {win_loss_ratio:.2f}")
        
        print(f"\n⏱️  TRADE DURATION:")
        print(f"   Avg Duration:       {stats['avg_duration']:.0f} minutes")
        print(f"   Largest Win:        ₹{stats['largest_win']:+,.0f}")
        print(f"   Largest Loss:       ₹{stats['largest_loss']:+,.0f}")
    
    def print_strategy_performance(self):
        """Print strategy performance"""
        print(f"\n🎲 STRATEGY PERFORMANCE:")
        for strat_name, strat_data in self.strategies.items():
            trades = strat_data['trades']
            if trades > 0:
                wins = strat_data['wins']
                pnl = strat_data['pnl']
                win_rate = wins / trades * 100
                avg_trade = pnl / trades
                weight = strat_data['weight'] * 100
                
                print(f"   {strat_name:15s}: ₹{pnl:+,.0f} ({trades} trades, {win_rate:.1f}% WR, {weight:.1f}% weight)")
    
    def print_monthly_performance(self):
        """Print monthly performance summary"""
        if not self.monthly_logs:
            return
        
        print(f"\n📅 MONTHLY PERFORMANCE SUMMARY:")
        
        monthly_stats = []
        for month, trades in self.monthly_logs.items():
            closed_trades = [t for t in trades if t['status'] == 'CLOSED']
            if closed_trades:
                month_pnl = sum(t.get('pnl', 0) for t in closed_trades)
                month_trades = len(closed_trades)
                month_wins = len([t for t in closed_trades if t.get('pnl', 0) > 0])
                month_win_rate = month_wins / month_trades * 100 if month_trades > 0 else 0
                
                monthly_stats.append({
                    'month': month,
                    'pnl': month_pnl,
                    'trades': month_trades,
                    'win_rate': month_win_rate
                })
        
        if monthly_stats:
            # Sort by P&L
            monthly_stats.sort(key=lambda x: x['pnl'], reverse=True)
            
            profitable_months = len([m for m in monthly_stats if m['pnl'] > 0])
            total_months = len(monthly_stats)
            monthly_win_rate = profitable_months / total_months * 100
            
            print(f"   Profitable Months:  {profitable_months}/{total_months} ({monthly_win_rate:.1f}%)")
            
            # Top 5 months
            print(f"\n   Top 5 Months:")
            for month_stat in monthly_stats[:5]:
                print(f"   {month_stat['month']}: ₹{month_stat['pnl']:+,.0f} ({month_stat['trades']} trades, {month_stat['win_rate']:.1f}% WR)")
    
    def print_risk_metrics(self, closed_trades):
        """Print risk metrics"""
        if not closed_trades:
            return
        
        # Calculate risk metrics
        risk_amounts = [t['risk_amount'] for t in closed_trades]
        risk_pcts = [t['risk_pct'] for t in closed_trades]
        pnls = [t['pnl'] for t in closed_trades]
        
        avg_risk_amount = np.mean(risk_amounts)
        avg_risk_pct = np.mean(risk_pcts)
        avg_r_multiple = np.mean([p / r for p, r in zip(pnls, risk_amounts) if r > 0]) if any(r > 0 for r in risk_amounts) else 0
        
        print(f"\n⚖️ RISK METRICS:")
        print(f"   Avg Risk/Trade:     ₹{avg_risk_amount:,.0f} ({avg_risk_pct:.2f}%)")
        print(f"   Target Risk:        ₹{self.initial_capital * self.max_risk_per_trade:,.0f} ({self.max_risk_per_trade*100:.0f}%)")
        print(f"   Avg R Multiple:     {avg_r_multiple:.2f}")
        
        # Risk efficiency
        if avg_risk_pct > 0:
            risk_efficiency = self.total_pnl / (avg_risk_amount * len(closed_trades))
            print(f"   Risk Efficiency:    {risk_efficiency:.2f}")
    
    def assess_performance(self, stats):
        """Assess overall performance"""
        print(f"\n{'='*120}")
        
        if stats['annual_return'] >= 50 and stats['max_drawdown'] < 15:
            print("✅✅✅ EXCEPTIONAL PERFORMANCE!".center(120))
            print(f"TARGET ACHIEVED: {stats['annual_return']:.1f}% Annual with {stats['max_drawdown']:.1f}% Drawdown".center(120))
        elif stats['annual_return'] >= 40:
            print("✅ VERY GOOD PERFORMANCE".center(120))
            print(f"{stats['annual_return']:.1f}% Annual Return".center(120))
        elif stats['annual_return'] >= 30:
            print("⚠️ DECENT PERFORMANCE - ROOM FOR OPTIMIZATION".center(120))
        elif stats['annual_return'] >= 20:
            print("⚠️ BELOW TARGET - NEEDS IMPROVEMENT".center(120))
        else:
            print("❌ POOR PERFORMANCE - MAJOR OPTIMIZATION REQUIRED".center(120))
        
        print(f"{'='*120}")
    
    def save_all_data(self):
        """Save all generated data"""
        print(f"\n💾 SAVING ALL DATA TO {self.output_dir}/")
        
        try:
            # 1. Save all trades
            if self.trades:
                trades_df = pd.DataFrame(self.trades)
                trades_file = f"{self.output_dir}/trades/all_trades_detailed.csv"
                trades_df.to_csv(trades_file, index=False)
                print(f"   ✅ All trades: {trades_file} ({len(trades_df)} trades)")
            
            # 2. Save ML data
            if self.ml_trade_data:
                ml_df = pd.DataFrame(self.ml_trade_data)
                ml_file = f"{self.output_dir}/ml_data/ml_training_data.csv"
                ml_df.to_csv(ml_file, index=False)
                print(f"   ✅ ML training data: {ml_file} ({len(ml_df)} records)")
            
            # 3. Save monthly logs
            monthly_files = 0
            for month, trades in self.monthly_logs.items():
                if trades:
                    month_df = pd.DataFrame(trades)
                    month_file = f"{self.output_dir}/monthly/trades_{month}.csv"
                    month_df.to_csv(month_file, index=False)
                    monthly_files += 1
            
            if monthly_files > 0:
                print(f"   ✅ Monthly logs: {monthly_files} files")
            
            # 4. Save yearly logs
            yearly_files = 0
            for year, trades in self.yearly_logs.items():
                if trades:
                    year_df = pd.DataFrame(trades)
                    year_file = f"{self.output_dir}/yearly/trades_{year}.csv"
                    year_df.to_csv(year_file, index=False)
                    yearly_files += 1
            
            if yearly_files > 0:
                print(f"   ✅ Yearly logs: {yearly_files} files")
            
            # 5. Save equity curve
            equity_df = pd.DataFrame({
                'equity': self.equity_curve,
                'drawdown': self.drawdown_curve[:len(self.equity_curve)]
            })
            equity_file = f"{self.output_dir}/equity/equity_curve.csv"
            equity_df.to_csv(equity_file, index=False)
            print(f"   ✅ Equity curve: {equity_file}")
            
            # 6. Save strategy performance
            strategy_data = []
            for strat_name, strat_data in self.strategies.items():
                win_rate = strat_data['wins'] / strat_data['trades'] * 100 if strat_data['trades'] > 0 else 0
                strategy_data.append({
                    'strategy': strat_name,
                    'weight': strat_data['weight'] * 100,
                    'trades': strat_data['trades'],
                    'wins': strat_data['wins'],
                    'win_rate': win_rate,
                    'pnl': strat_data['pnl']
                })
            
            strategy_df = pd.DataFrame(strategy_data)
            strategy_file = f"{self.output_dir}/reports/strategy_performance.csv"
            strategy_df.to_csv(strategy_file, index=False)
            print(f"   ✅ Strategy performance: {strategy_file}")
            
            # 7. Save summary statistics
            closed_trades = [t for t in self.trades if t['status'] == 'CLOSED']
            stats = self.calculate_statistics(closed_trades)
            
            stats_file = f"{self.output_dir}/reports/summary_statistics.json"
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2)
            print(f"   ✅ Summary statistics: {stats_file}")
            
            # 8. Save configuration
            config = {
                'initial_capital': self.initial_capital,
                'max_risk_per_trade': self.max_risk_per_trade,
                'max_drawdown_allowed': self.max_drawdown_allowed,
                'max_daily_trades': self.max_daily_trades,
                'max_concurrent_trades': self.max_concurrent_trades,
                'strategies': self.strategies
            }
            
            config_file = f"{self.output_dir}/reports/system_configuration.json"
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)
            print(f"   ✅ System configuration: {config_file}")
            
            print(f"\n📁 ALL DATA SAVED SUCCESSFULLY!")
            print(f"   Check {self.output_dir}/ for complete analytics")
            
        except Exception as e:
            print(f"❌ ERROR saving data: {e}")
            traceback.print_exc()


def main():
    """Main execution function"""
    print("\n🔥 ULTIMATE MONEY PRINTER v14.0")
    print("Professional Algorithmic Trading System")
    print("=" * 60)
    
    # Check for data file
    data_file = "NIFTY_1MIN_2015_2025.csv"
    
    if not os.path.exists(data_file):
        print(f"\n❌ ERROR: Data file '{data_file}' not found!")
        print(f"   Current directory: {os.getcwd()}")
        print(f"   Available CSV files: {[f for f in os.listdir('.') if f.endswith('.csv')]}")
        return
    
    # Initialize system
    print(f"\n💰 Initializing with ₹100,000 capital...")
    money_printer = UltimateMoneyPrinterPro(capital=100000)
    
    # Load and prepare data
    print(f"\n📊 Loading data from: {data_file}")
    df = money_printer.load_and_prepare_data(data_file)
    
    if df is None:
        print("❌ Failed to load data. Exiting.")
        return
    
    # Run comprehensive backtest
    print(f"\n🚀 Starting comprehensive backtest...")
    money_printer.run_comprehensive_backtest(df)
    
    print(f"\n✅ Process complete!")
    print(f"📊 All results saved to: {money_printer.output_dir}/")


if __name__ == "__main__":
    main()