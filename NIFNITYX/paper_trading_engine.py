#!/usr/bin/env python3
"""
Paper Trading Engine
Simulates real trades with slippage, costs, and realistic fills
"""

import json
import pandas as pd
from datetime import datetime
import os

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
        
        # Need minimum capital for margin
        required_margin = 150000  # Approx for 1 lot NIFTY
        if self.capital < required_margin:
            return False, f"Insufficient capital (need ₹{required_margin:,})"
        
        return True, "OK"
    
    
    def execute_signal(self, signal, current_price, ml_score=20):
        """
        Execute a signal (paper trade)
        
        Args:
            signal: Signal dict from Layer 1
            current_price: Current market price
            ml_score: ML score for lot sizing
        
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
            'entry_time': datetime.now(),
            'action': action,
            'entry_price': entry_price,
            'lots': lots,
            'quantity': self.lot_size * lots,
            'stop_loss': signal['stop'],
            'target': signal['target'],
            'setup': signal.get('setup', 'unknown'),
            'ml_score': ml_score,
            'entry_costs': entry_costs,
            'status': 'OPEN'
        }
        
        self.open_positions.append(position)
        self.total_signals_executed += 1
        self.today_costs += entry_costs['total']
        
        print(f"\n✅ PAPER TRADE EXECUTED")
        print(f"   {action} {lots} Lot @ ₹{entry_price:,.2f}")
        print(f"   Stop: ₹{signal['stop']:,.2f} | Target: ₹{signal['target']:,.2f}")
        print(f"   Entry Costs: ₹{entry_costs['total']:,.2f}")
        
        return {
            'executed': True,
            'position': position,
            'signal_id': position['signal_id'],
            'trade_id': position['trade_id']
        }
    
    
    def update_positions(self, current_price, current_time):
        """
        Update all open positions
        Check for stop loss / target hits
        
        Args:
            current_price: Current NIFTY price
            current_time: Current timestamp
        """
        positions_to_close = []
        
        for i, pos in enumerate(self.open_positions):
            action = pos['action']
            entry_price = pos['entry_price']
            stop_loss = pos['stop_loss']
            target = pos['target']
            
            # Check if stop or target hit
            exit_triggered = False
            exit_reason = None
            exit_price = None
            
            if action == 'BUY':
                if current_price <= stop_loss:
                    exit_triggered = True
                    exit_reason = 'STOP_HIT'
                    exit_price = stop_loss
                elif current_price >= target:
                    exit_triggered = True
                    exit_reason = 'TARGET_HIT'
                    exit_price = target
            else:  # SELL
                if current_price >= stop_loss:
                    exit_triggered = True
                    exit_reason = 'STOP_HIT'
                    exit_price = stop_loss
                elif current_price <= target:
                    exit_triggered = True
                    exit_reason = 'TARGET_HIT'
                    exit_price = target
            
            if exit_triggered:
                positions_to_close.append((i, exit_price, exit_reason, current_time))
        
        # Close positions
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
        
        emoji = "✅" if pos['won'] else "❌"
        print(f"\n{emoji} POSITION CLOSED - {exit_reason}")
        print(f"   {pos['action']} {pos['lots']} Lot")
        print(f"   Entry: ₹{pos['entry_price']:,.2f} → Exit: ₹{exit_price_with_slippage:,.2f}")
        print(f"   Gross P&L: ₹{result['gross_pnl']:+,.2f}")
        print(f"   Costs: ₹{result['total_costs']:,.2f}")
        print(f"   Net P&L: ₹{result['net_pnl']:+,.2f}")
        print(f"   Capital: ₹{self.capital:,.2f}")
    
    
    def force_close_all(self, current_price, reason="EOD"):
        """Force close all positions (end of day)"""
        while self.open_positions:
            self.close_position(0, current_price, reason, datetime.now())
    
    
    def get_daily_stats(self):
        """Get today's statistics"""
        wins = len([t for t in self.closed_trades if t.get('won', False)])
        losses = len(self.closed_trades) - wins
        win_rate = (wins / len(self.closed_trades) * 100) if self.closed_trades else 0
        
        return {
            'date': datetime.now().strftime('%Y-%m-%d'),
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
