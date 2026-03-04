#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  LAYER 1: CORE TRADING BOT (MODULAR)                                         ║
║  File: layer1_trading_bot.py                                                  ║
║                                                                                ║
║  - Generates trading signals based on technical analysis                      ║
║  - Returns signal objects that can be filtered by Layer 2 & 3                ║
║  - Standalone: Can run independently for backtesting                          ║
║  - Integrated: Provides signals to the 3-layer system                         ║
║                                                                                ║
║  Signal Output Format:                                                        ║
║  {                                                                             ║
║    'action': 'BUY/SELL',                                                      ║
║    'price': float,                                                            ║
║    'stop': float,                                                             ║
║    'target': float,                                                           ║
║    'confidence': 0-1,                                                         ║
║    'technical_score': 0-100,  # NEW: For 3-layer scoring                     ║
║    'features': {...}           # NEW: Market features for ML                  ║
║  }                                                                             ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from collections import deque
import warnings
warnings.filterwarnings('ignore')

class TradingBot:
    """
    Layer 1: Pure technical analysis trading bot
    
    This bot generates signals based on proven technical strategies.
    It does NOT make final execution decisions - that's Layer 3's job.
    """
    
    def __init__(self, capital=100000):
        # Capital management
        self.initial_capital = float(capital)
        self.capital = float(capital)
        self.peak_capital = float(capital)
        
        # Trading parameters
        self.lot_size = 75
        self.point_value = 75
        self.base_risk = 0.008
        self.max_risk = 0.015
        self.min_risk = 0.004
        self.max_portfolio_heat = 0.03
        self.min_rr = 2.5
        
        # State tracking
        self.reset_state()
        
        print("✅ Layer 1: Trading Bot initialized")
    
    def reset_state(self):
        """Reset trading state (for yearly backtests)"""
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
    
    def calculate_indicators(self, df):
        """Calculate all technical indicators"""
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
        df['rsi'] = 100 - (100 / (1 + gain / (loss + 0.0001)))
        
        # MACD
        df['macd'] = df['close'].ewm(12).mean() - df['close'].ewm(26).mean()
        df['macd_sig'] = df['macd'].ewm(9).mean()
        df['macd_hist'] = df['macd'] - df['macd_sig']
        
        # Bollinger Bands
        df['bb_mid'] = df['close'].rolling(20).mean()
        bb_std = df['close'].rolling(20).std()
        df['bb_upper'] = df['bb_mid'] + 2 * bb_std
        df['bb_lower'] = df['bb_mid'] - 2 * bb_std
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_mid']
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'] + 0.0001)
        
        # ADX
        df['adx'] = self._calculate_adx(df)
        
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
        
        # Fill missing values: earlier pandas versions accepted fillna(method=..),
        # newer ones do not.  Use ffill() for forward‑fill then zero for any
        # remaining NaNs.
        df = df.ffill().fillna(0)
        return df
    
    def _calculate_adx(self, df, period=14):
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
    
    def detect_regime(self, row):
        """Detect market regime"""
        if row['adx'] > 28:
            if row['trend_up']:
                self.regime = "STRONG_UPTREND"
                return "STRONG_UPTREND"
            elif row['trend_down']:
                self.regime = "STRONG_DOWNTREND"
                return "STRONG_DOWNTREND"
            else:
                self.regime = "MIXED"
                return "MIXED"
        else:
            self.regime = "RANGING"
            return "RANGING"
    
    def generate_signal(self, df, idx):
        """
        Generate trading signal with technical score
        
        Returns:
            signal_dict or None
        """
        if idx < 100:
            return None
        
        row = df.iloc[idx]
        regime = self.detect_regime(row)
        
        # Calculate technical score (0-100)
        technical_score = self._calculate_technical_score(row, regime)
        
        # Extract market features for ML
        features = self._extract_features(row, df, idx)
        
        # BULLISH SIGNAL
        if row['adx'] > 28 and row['trend_up'] and regime == "STRONG_UPTREND":
            pullback = row['low'] <= row['ema21'] * 1.003 and row['close'] > row['ema21']
            momentum_ok = row['mom10'] > 0.3 and 45 < row['rsi'] < 70
            macd_ok = row['macd'] > row['macd_sig']
            
            if pullback and momentum_ok and macd_ok:
                # Calculate stops
                atr_stop = row['close'] - 1.8 * row['atr']
                ema_stop = row['ema50']
                stop = max(atr_stop, ema_stop, row['support'], row['close'] - 50)
                risk_pts = max(row['close'] - stop, 20)
                
                if risk_pts > 100:
                    return None
                
                target = row['close'] + risk_pts * 3.0
                
                return {
                    'action': 'BUY',
                    'price': row['close'],
                    'stop': stop,
                    'target': target,
                    'confidence': 0.80,
                    'rr': 3.0,
                    'setup': 'trend_pullback_buy',
                    'regime': regime,
                    'technical_score': technical_score,  # For Layer 3 scoring
                    'features': features,                # For Layer 3 ML model
                    'timestamp': df.index[idx]
                }
        
        # BEARISH SIGNAL
        elif row['adx'] > 28 and row['trend_down'] and regime == "STRONG_DOWNTREND":
            bounce = row['high'] >= row['ema21'] * 0.997 and row['close'] < row['ema21']
            momentum_ok = row['mom10'] < -0.3 and 30 < row['rsi'] < 55
            macd_ok = row['macd'] < row['macd_sig']
            
            if bounce and momentum_ok and macd_ok:
                atr_stop = row['close'] + 1.8 * row['atr']
                ema_stop = row['ema50']
                stop = min(atr_stop, ema_stop, row['resistance'], row['close'] + 50)
                risk_pts = max(stop - row['close'], 20)
                
                if risk_pts > 100:
                    return None
                
                target = row['close'] - risk_pts * 3.0
                
                return {
                    'action': 'SELL',
                    'price': row['close'],
                    'stop': stop,
                    'target': target,
                    'confidence': 0.80,
                    'rr': 3.0,
                    'setup': 'trend_bounce_sell',
                    'regime': regime,
                    'technical_score': technical_score,
                    'features': features,
                    'timestamp': df.index[idx]
                }
        
        return None
    
    def _calculate_technical_score(self, row, regime):
        """
        Calculate technical strength score (0-100)
        Higher score = stronger technical setup
        """
        score = 0
        
        # Trend strength (0-30 points)
        if regime in ["STRONG_UPTREND", "STRONG_DOWNTREND"]:
            score += min(row['adx'] / 50 * 30, 30)
        else:
            score += min(row['adx'] / 50 * 15, 15)
        
        # RSI positioning (0-20 points)
        if 40 < row['rsi'] < 60:
            score += 20
        elif 35 < row['rsi'] < 65:
            score += 15
        elif 30 < row['rsi'] < 70:
            score += 10
        
        # MACD alignment (0-15 points)
        if abs(row['macd_hist']) > 0:
            score += min(abs(row['macd_hist']) * 10, 15)
        
        # Momentum (0-20 points)
        if abs(row['mom10']) > 1:
            score += min(abs(row['mom10']) * 5, 20)
        
        # Volatility (0-15 points) - prefer normal volatility
        if 0.15 < row['atr_pct'] < 0.35:
            score += 15
        elif 0.1 < row['atr_pct'] < 0.5:
            score += 10
        else:
            score += 5
        
        return min(score, 100)
    
    def _extract_features(self, row, df, idx):
        """
        Extract 50+ features for ML model (Layer 3)
        """
        features = {
            # Price indicators
            'close': row['close'],
            'atr_pct': row['atr_pct'],
            'rsi': row['rsi'],
            'adx': row['adx'],
            'macd': row['macd'],
            'macd_hist': row['macd_hist'],
            'bb_position': row['bb_position'],
            'bb_width': row['bb_width'],
            'mom10': row['mom10'],
            'mom20': row['mom20'],
            
            # Trend indicators
            'trend_up': row['trend_up'],
            'trend_down': row['trend_down'],
            'dist_ema9': row['dist_ema9'],
            'dist_ema21': row['dist_ema21'],
            'dist_ema50': row['dist_ema50'],
            
            # Account state
            'capital': self.capital,
            'drawdown_pct': (self.peak_capital - self.capital) / self.peak_capital * 100,
            'daily_trades': self.daily_trades,
            'portfolio_heat': self.portfolio_heat,
            'win_streak': self.win_streak,
            'loss_streak': self.loss_streak,
            
            # Recent performance
            'recent_win_rate': sum(1 for p in self.recent_pnl if p > 0) / len(self.recent_pnl) if len(self.recent_pnl) > 0 else 0.5,
            
            # Time features
            'hour': row['hour'],
            'day_of_week': row['day_of_week'],
            
            # Regime
            'regime': self.regime
        }
        
        return features
    
    def calculate_position_size(self, signal):
        """Calculate position size"""
        risk_pts = abs(signal['price'] - signal['stop'])
        risk_pct = self.base_risk * signal['confidence']
        
        # Adjust for recent performance
        if len(self.recent_pnl) >= 5:
            wr = sum(1 for p in self.recent_pnl if p > 0) / len(self.recent_pnl)
            if wr > 0.7:
                risk_pct *= 1.3
            elif wr < 0.4:
                risk_pct *= 0.6
        
        if self.loss_streak >= 2:
            risk_pct *= 0.5
        elif self.win_streak >= 3:
            risk_pct *= 1.2
        
        risk_pct = max(self.min_risk, min(self.max_risk, risk_pct))
        
        if self.portfolio_heat + risk_pct > self.max_portfolio_heat:
            return None
        
        risk_amount = self.capital * risk_pct
        lots = int(risk_amount / (risk_pts * self.point_value))
        lots = max(1, min(lots, 6))
        
        return {
            'lots': lots,
            'risk_pct': lots * risk_pts * self.point_value / self.capital,
            'risk_amount': lots * risk_pts * self.point_value
        }
    
    def execute_trade(self, signal, position):
        """Execute trade (called by Layer 3)"""
        trade = {
            'id': len(self.trades) + 1,
            'time': signal['timestamp'],
            'action': signal['action'],
            'price': signal['price'],
            'stop': signal['stop'],
            'target': signal['target'],
            'lots': position['lots'],
            'risk_pct': position['risk_pct'],
            'setup': signal['setup'],
            'technical_score': signal['technical_score'],
            'status': 'OPEN',
            'partial_closed': False,
            'trail_stop': signal['stop']
        }
        
        self.trades.append(trade)
        self.daily_trades += 1
        self.portfolio_heat += position['risk_pct']
        
        return trade
    
    def update_trade(self, price, timestamp):
        """Update open trades (scale-out, trailing)"""
        for t in [t for t in self.trades if t.get('status') == 'OPEN']:
            if t['action'] == 'BUY':
                pnl_pts = price - t['price']
                risk_pts = t['price'] - t['stop']
                
                # Scale out at 1.5R
                if not t['partial_closed'] and pnl_pts >= risk_pts * 1.5:
                    partial_lots = t['lots'] // 2
                    if partial_lots > 0:
                        partial_pnl = partial_lots * pnl_pts * self.point_value
                        self.capital += partial_pnl
                        self.daily_pnl += partial_pnl
                        t['lots'] -= partial_lots
                        t['partial_closed'] = True
                        t['trail_stop'] = t['price']
                
                # Trail
                if pnl_pts > risk_pts * 1.0:
                    new_stop = t['price'] + risk_pts * 0.7
                    if new_stop > t['trail_stop']:
                        t['trail_stop'] = new_stop
                
                # Exit
                if price <= t['trail_stop']:
                    return self.close_trade(t, t['trail_stop'], timestamp, 'STOP_HIT')
                elif price >= t['target']:
                    return self.close_trade(t, t['target'], timestamp, 'TARGET_HIT')
            
            else:  # SELL
                pnl_pts = t['price'] - price
                risk_pts = t['stop'] - t['price']
                
                if not t['partial_closed'] and pnl_pts >= risk_pts * 1.5:
                    partial_lots = t['lots'] // 2
                    if partial_lots > 0:
                        partial_pnl = partial_lots * pnl_pts * self.point_value
                        self.capital += partial_pnl
                        self.daily_pnl += partial_pnl
                        t['lots'] -= partial_lots
                        t['partial_closed'] = True
                        t['trail_stop'] = t['price']
                
                if pnl_pts > risk_pts * 1.0:
                    new_stop = t['price'] - risk_pts * 0.7
                    if new_stop < t['trail_stop']:
                        t['trail_stop'] = new_stop
                
                if price >= t['trail_stop']:
                    return self.close_trade(t, t['trail_stop'], timestamp, 'STOP_HIT')
                elif price <= t['target']:
                    return self.close_trade(t, t['target'], timestamp, 'TARGET_HIT')
        
        return None
    
    def close_trade(self, trade, exit_price, timestamp, reason):
        """Close trade"""
        pnl_pts = (exit_price - trade['price']) if trade['action'] == 'BUY' else (trade['price'] - exit_price)
        pnl = pnl_pts * trade['lots'] * self.point_value
        
        self.capital += pnl
        self.daily_pnl += pnl
        self.equity_curve.append(self.capital)
        self.portfolio_heat -= trade.get('risk_pct', 0)
        self.portfolio_heat = max(0, self.portfolio_heat)
        
        trade['exit_price'] = exit_price
        trade['exit_time'] = timestamp
        trade['exit_reason'] = reason
        trade['pnl'] = pnl
        trade['status'] = 'CLOSED'
        
        if pnl > 0:
            self.win_streak += 1
            self.loss_streak = 0
        else:
            self.win_streak = 0
            self.loss_streak += 1
        
        self.recent_pnl.append(pnl)
        
        if self.capital > self.peak_capital:
            self.peak_capital = self.capital
        dd = (self.peak_capital - self.capital) / self.peak_capital
        if dd > self.max_drawdown:
            self.max_drawdown = dd
        
        return trade


# ═══════════════════════════════════════════════════════════════════════════════
#                    STANDALONE MODE (for testing Layer 1 alone)
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "="*80)
    print("LAYER 1: TRADING BOT - STANDALONE TEST MODE".center(80))
    print("="*80 + "\n")
    
    # This allows testing the trading bot independently
    # In integrated mode, this code won't run
    
    bot = TradingBot(capital=100000)
    print("✅ Trading Bot ready for signal generation")
    print("   Use bot.generate_signal(df, idx) to get signals")
    print("   Signals include: technical_score and features for Layer 2 & 3")