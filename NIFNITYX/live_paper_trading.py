#!/usr/bin/env python3
"""
Paper Trading Engine
Simulates real trades with slippage, costs, and realistic fills
"""

import json
import pandas as pd
from datetime import datetime
import os
import requests
import config

class PaperTradingEngine:
    """
    Simulates paper trading with realistic execution
    """
    
    def __init__(self, initial_capital=100000, cost_calculator=None):
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.cost_calc = cost_calculator
        
        # Positions
        self.open_positions = []
        self.closed_trades = []
        
        # Today's tracking
        self.today_signals = []
        self.today_pnl = 0
        self.today_costs = 0
        
        # Stats
        self.total_signals_generated = 0
        self.total_signals_executed = 0
        self.total_trades_completed = 0
        
        # Settings
        self.lot_size = 75  # NIFTY lot size
        self.max_positions = 3  # Max simultaneous positions
        
        print(f"📊 Paper Trading Engine initialized")
        print(f"   Capital: ₹{initial_capital:,}")
        print(f"   Max Positions: {self.max_positions}")
    
    
    def can_take_trade(self):
        """Check if we can take a new trade"""
        if len(self.open_positions) >= self.max_positions:
            return False, "Max positions reached"
        
        # Reduced margin requirement for paper trading
        required_margin = 50000  # Reduced from 150000
        if self.capital < required_margin:
            return False, f"Insufficient capital (need ₹{required_margin:,})"
        
        return True, "OK"
    
    
    def _send_update_to_node(self, trade_data):
        """Send trade close update to Node.js Mission Control"""
        try:
            payload = {
                "trade_id": trade_data.get('trade_id', trade_data.get('signal_id')),
                "status": "WIN" if trade_data.get('net_pnl', 0) > 0 else "LOSS",
                "exit": {
                    "price": trade_data.get('exit_price'),
                    "time": str(trade_data.get('exit_time')),
                    "reason": trade_data.get('exit_reason')
                },
                "pnl": trade_data.get('net_pnl', 0),
                "pnl_percentage": (
                    trade_data.get('net_pnl', 0) / 
                    (trade_data.get('entry_price', 1) * trade_data.get('lots', 1) * 75)
                ) * 100,
                # --- NEW LINES ADDED FOR NIFNITYX ANALYTICS ---
                "gross_pnl": trade_data.get('gross_pnl', 0),
                "total_costs": trade_data.get('total_costs', 0),
                "cost_breakdown": trade_data.get('exit_costs', {}),
                "strategy_name": trade_data.get('strategy_name', 'sniper')
            }
            requests.post(
                f"{config.NODE_API_URL}/update",
                json=payload,
                headers={"x-python-secret": config.NODE_SECRET},
                timeout=5
            )
            print(f"📡 Trade update sent to Mission Control: {payload['trade_id']} → {payload['status']}")
        except Exception as e:
            print(f"⚠️  Could not send update to Node.js: {e}")
    
    
    def execute_signal(self, signal, current_price, ml_score=20, current_time=None):
        """
        Execute a signal (paper trade)
        
        Args:
            signal: Signal dict from Layer 1
            current_price: Current market price
            ml_score: ML score for lot sizing
            current_time: Simulated time (defaults to datetime.now())
        
        Returns:
            dict with execution details
        """
        self.total_signals_generated += 1
        
        # Check if we can trade
        can_trade, reason = self.can_take_trade()
        if not can_trade:
            return {
                'executed': False,
                'reason': reason,
                'signal_id': f"SIG_{self.total_signals_generated}"
            }
        
        # ML-based lot sizing
        if ml_score < 15:
            lots = 0.5
        elif ml_score < 22:
            lots = 0.75
        else:
            lots = 1.25
        
        # Round to nearest 0.5
        lots = round(lots * 2) / 2
        if lots < 0.5:
            lots = 0.5
        
        # Simulate slippage
        action = signal['action']
        entry_price = self.cost_calc.calculate_slippage(current_price, action)
        
        # Calculate entry costs
        if action == 'BUY':
            entry_costs = self.cost_calc.calculate_entry_costs(entry_price, self.lot_size * lots)
        else:
            entry_costs = self.cost_calc.calculate_exit_costs(entry_price, self.lot_size * lots)
        
        # Create position
        position = {
            'signal_id': f"SIG_{self.total_signals_generated}",
            'trade_id': f"TRD_{len(self.closed_trades) + len(self.open_positions) + 1}",
            'entry_time': current_time or datetime.now(),
            'action': action,
            'entry_price': entry_price,
            'lots': lots,
            'quantity': self.lot_size * lots,
            'stop_loss': signal['stop'],
            'target': signal['target'],
            'trail_stop': signal['stop'],   # mirrors TradingBot.update_trade() trailing logic
            'partial_closed': False,
            'setup': signal.get('setup', 'unknown'),
            'ml_score': ml_score,
            'entry_costs': entry_costs,
            'status': 'OPEN'
        }
        
        self.open_positions.append(position)
        self.total_signals_executed += 1
        self.total_trades_completed += 1  # FIX: Increment counter when trade opens
        self.today_costs += entry_costs['total']
        
        print(f"\n✅ PAPER TRADE EXECUTED")
        print(f"   📊 Trade Counter: {self.total_trades_completed} trades executed")
        print(f"   {action} {lots} Lot @ ₹{entry_price:,.2f}")
        print(f"   Stop: ₹{signal['stop']:,.2f} | Target: ₹{signal['target']:,.2f}")
        print(f"   Entry Costs: ₹{entry_costs['total']:,.2f}")
        print(f"   🔍 Total open positions: {len(self.open_positions)}")
        
        return {
            'executed': True,
            'position': position,
            'signal_id': position['signal_id'],
            'trade_id': position['trade_id']
        }
    
    
    def update_positions(self, candle_data, current_time):
        """
        Update open positions with TRAILING STOP — mirrors TradingBot.update_trade() exactly.

        Without this, every trade the backtest closes as STOP_HIT-WIN (trailing stop in
        profit zone) becomes a STOP_HIT-LOSS here (static original stop). This was the
        sole reason demo showed 100% losses while backtest showed ~55% win rate.

        Logic (identical to layer1_trading_bot.py):
          BUY:  once profit >= 1.5R → scale out half, trail to breakeven
                once profit >= 1.0R → trail to entry + 0.7R
                exit: low <= trail_stop (STOP_HIT) or high >= target (TARGET_HIT)
          SELL: mirror image
        """
        if not self.open_positions:
            return

        if isinstance(candle_data, dict):
            current_price = candle_data.get('close', candle_data.get('price', 0))
            high_price    = candle_data.get('high', current_price)
            low_price     = candle_data.get('low',  current_price)
        else:
            current_price = high_price = low_price = float(candle_data)

        positions_to_close = []

        for i, pos in enumerate(self.open_positions):
            action      = pos['action']
            entry_price = pos['entry_price']
            stop_loss   = pos['stop_loss']
            target      = pos['target']
            trade_id    = pos.get('trade_id', 'UNKNOWN')

            # Backfill trail_stop for any position opened before this fix
            if 'trail_stop' not in pos:
                pos['trail_stop'] = stop_loss
            if 'partial_closed' not in pos:
                pos['partial_closed'] = False

            trail_stop = pos['trail_stop']

            if i == 0:
                print(
                    f"\r🔍 {trade_id}: {action} Entry={entry_price:.2f} "
                    f"Trail={trail_stop:.2f} Target={target:.2f} "
                    f"| L={low_price:.2f} H={high_price:.2f}",
                    end='', flush=True
                )

            if action == 'BUY':
                pnl_pts  = current_price - entry_price
                risk_pts = entry_price - stop_loss

                # Scale-out at 1.5R: take half off, move trail to breakeven
                if not pos['partial_closed'] and pnl_pts >= risk_pts * 1.5:
                    partial_lots = pos['lots'] // 2
                    if partial_lots > 0:
                        self.capital   += partial_lots * pnl_pts * self.lot_size
                        self.today_pnl += partial_lots * pnl_pts * self.lot_size
                        pos['lots']          -= partial_lots
                        pos['partial_closed'] = True
                        pos['trail_stop']     = entry_price
                        trail_stop            = entry_price

                # Trail: lock in 0.7R profit
                if pnl_pts > risk_pts * 1.0:
                    new_trail = entry_price + risk_pts * 0.7
                    if new_trail > trail_stop:
                        pos['trail_stop'] = new_trail
                        trail_stop = new_trail

                if low_price <= trail_stop:
                    positions_to_close.append((i, trail_stop, 'STOP_HIT', current_time))
                elif high_price >= target:
                    positions_to_close.append((i, target, 'TARGET_HIT', current_time))

            else:  # SELL
                pnl_pts  = entry_price - current_price
                risk_pts = stop_loss - entry_price

                # Scale-out at 1.5R
                if not pos['partial_closed'] and pnl_pts >= risk_pts * 1.5:
                    partial_lots = pos['lots'] // 2
                    if partial_lots > 0:
                        self.capital   += partial_lots * pnl_pts * self.lot_size
                        self.today_pnl += partial_lots * pnl_pts * self.lot_size
                        pos['lots']          -= partial_lots
                        pos['partial_closed'] = True
                        pos['trail_stop']     = entry_price
                        trail_stop            = entry_price

                # Trail: lock in 0.7R profit
                if pnl_pts > risk_pts * 1.0:
                    new_trail = entry_price - risk_pts * 0.7
                    if new_trail < trail_stop:
                        pos['trail_stop'] = new_trail
                        trail_stop = new_trail

                if high_price >= trail_stop:
                    positions_to_close.append((i, trail_stop, 'STOP_HIT', current_time))
                elif low_price <= target:
                    positions_to_close.append((i, target, 'TARGET_HIT', current_time))

        for i, exit_price, exit_reason, exit_time in reversed(positions_to_close):
            self.close_position(i, exit_price, exit_reason, exit_time)
    
    
    def close_position(self, position_index, exit_price, exit_reason, exit_time):
        """Close a position and calculate P&L"""
        pos = self.open_positions[position_index]
        
        # Apply slippage to exit
        exit_price_with_slippage = self.cost_calc.calculate_slippage(
            exit_price, 
            'SELL' if pos['action'] == 'BUY' else 'BUY'
        )
        
        # Calculate P&L
        result = self.cost_calc.calculate_trade_pnl(
            pos['entry_price'],
            exit_price_with_slippage,
            pos['action'],
            self.lot_size,
            pos['lots']
        )
        
        # Update position
        pos['exit_time'] = exit_time
        pos['exit_price'] = exit_price_with_slippage
        pos['exit_reason'] = exit_reason
        pos['gross_pnl'] = result['gross_pnl']
        pos['exit_costs'] = result['exit_costs']
        pos['total_costs'] = result['total_costs']
        pos['net_pnl'] = result['net_pnl']
        pos['status'] = 'CLOSED'
        pos['won'] = result['net_pnl'] > 0
        
        # Update capital
        self.capital += result['net_pnl']
        self.today_pnl += result['net_pnl']
        self.today_costs += result['exit_costs']['total']
        
        # Move to closed trades
        self.closed_trades.append(pos)
        self.open_positions.pop(position_index)
        self.total_trades_completed += 1
        
        # Notify Node.js Mission Control
        self._send_update_to_node(pos)
        
        emoji = "✅" if pos['won'] else "❌"
        print(f"\n{emoji} POSITION CLOSED - {exit_reason}")
        print(f"   {pos['action']} {pos['lots']} Lot")
        print(f"   Entry: ₹{pos['entry_price']:,.2f} → Exit: ₹{exit_price_with_slippage:,.2f}")
        print(f"   Gross P&L: ₹{result['gross_pnl']:+,.2f}")
        print(f"   Costs: ₹{result['total_costs']:,.2f}")
        print(f"   Net P&L: ₹{result['net_pnl']:+,.2f}")
        print(f"   Capital: ₹{self.capital:,.2f}")
    
    
    def force_close_all(self, current_price, reason="EOD", current_time=None):
        """Force close all positions (end of day)"""
        while self.open_positions:
            self.close_position(0, current_price, reason, current_time or datetime.now())
    
    
    def get_daily_stats(self, current_time=None):
        """Get today's statistics"""
        wins = len([t for t in self.closed_trades if t.get('won', False)])
        losses = len(self.closed_trades) - wins
        win_rate = (wins / len(self.closed_trades) * 100) if self.closed_trades else 0
        
        ref_time = current_time or datetime.now()
        return {
            'date': ref_time.strftime('%Y-%m-%d'),
            'signals_generated': self.total_signals_generated,
            'signals_executed': self.total_signals_executed,
            'trades_completed': self.total_trades_completed,
            'wins': wins,
            'losses': losses,
            'win_rate': win_rate,
            'gross_pnl': self.today_pnl + self.today_costs,
            'costs': self.today_costs,
            'net_pnl': self.today_pnl,
            'capital': self.capital,
            'return_pct': ((self.capital / self.initial_capital) - 1) * 100,
            'open_positions': len(self.open_positions)
        }
    
    
    def save_trades(self, filename):
        """Save all trades to CSV"""
        if self.closed_trades:
            df = pd.DataFrame(self.closed_trades)
            df.to_csv(filename, index=False)
            print(f"✅ Trades saved to {filename}")


# Test
if __name__ == "__main__":
    from cost_calculator import CostCalculator
    
    print("\n" + "="*80)
    print("TESTING PAPER TRADING ENGINE".center(80))
    print("="*80 + "\n")
    
    calc = CostCalculator()
    engine = PaperTradingEngine(initial_capital=100000, cost_calculator=calc)
    
    # Simulate a signal
    signal = {
        'action': 'BUY',
        'price': 25000,
        'stop': 24950,
        'target': 25100,
        'setup': 'test'
    }
    
    result = engine.execute_signal(signal, 25000, ml_score=25)
    print(f"\n   Trade ID: {result.get('trade_id')}")
    
    # Simulate target hit
    print(f"\n📊 Simulating price movement to target...")
    engine.update_positions(25100, datetime.now())
    
    stats = engine.get_daily_stats()
    print(f"\n📊 Daily Stats:")
    print(f"   Trades: {stats['trades_completed']}")
    print(f"   Win Rate: {stats['win_rate']:.1f}%")
    print(f"   Net P&L: ₹{stats['net_pnl']:+,.2f}")
    print(f"   Return: {stats['return_pct']:+.2f}%")
    
    print("\n✅ Paper trading engine working!")