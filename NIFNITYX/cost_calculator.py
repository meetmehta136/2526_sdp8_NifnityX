#!/usr/bin/env python3
"""
Indian Brokerage Cost Calculator
Calculates ALL costs for NIFTY futures trading
"""

class CostCalculator:
    """
    Calculates complete cost breakdown for each trade
    Based on Angel One charges (can adjust for other brokers)
    """
    
    def __init__(self, brokerage_per_order=20):
        """
        Angel One charges:
        - Futures: ₹20 per executed order (or 0.01% whichever is lower)
        """
        self.brokerage_per_order = brokerage_per_order
        
        # NSE charges (as % of turnover)
        self.nse_charges_rate = 0.00325 / 100  # 0.00325%
        
        # STT (Securities Transaction Tax) - only on SELL side
        self.stt_rate = 0.0125 / 100  # 0.0125% on sell side
        
        # SEBI charges
        self.sebi_charges_rate = 10 / 10000000  # ₹10 per crore
        
        # Stamp duty (only on BUY side)
        self.stamp_duty_rate = 0.002 / 100  # 0.002% on buy side
        
        # GST (on brokerage + transaction charges)
        self.gst_rate = 0.18  # 18%
        
        print("💰 Cost Calculator initialized")
        print(f"   Brokerage: ₹{brokerage_per_order}/order")
    
    
    def calculate_entry_costs(self, entry_price, lot_size=75):
        """
        Calculate costs when ENTERING a position (BUY)
        
        Args:
            entry_price: Entry price per unit
            lot_size: 75 for NIFTY (1 lot = 75 qty)
        
        Returns:
            dict with cost breakdown
        """
        turnover = entry_price * lot_size
        
        # Brokerage
        brokerage = min(self.brokerage_per_order, turnover * 0.01 / 100)
        
        # Exchange charges (NSE)
        exchange_charges = turnover * self.nse_charges_rate
        
        # SEBI charges
        sebi_charges = turnover * self.sebi_charges_rate
        
        # Stamp duty (only on BUY)
        stamp_duty = turnover * self.stamp_duty_rate
        
        # GST (on brokerage + exchange charges)
        gst = (brokerage + exchange_charges) * self.gst_rate
        
        # Total
        total_entry_cost = brokerage + exchange_charges + sebi_charges + stamp_duty + gst
        
        return {
            'brokerage': round(brokerage, 2),
            'exchange_charges': round(exchange_charges, 2),
            'sebi_charges': round(sebi_charges, 2),
            'stamp_duty': round(stamp_duty, 2),
            'gst': round(gst, 2),
            'total': round(total_entry_cost, 2)
        }
    
    
    def calculate_exit_costs(self, exit_price, lot_size=75):
        """
        Calculate costs when EXITING a position (SELL)
        
        Args:
            exit_price: Exit price per unit
            lot_size: 75 for NIFTY
        
        Returns:
            dict with cost breakdown
        """
        turnover = exit_price * lot_size
        
        # Brokerage
        brokerage = min(self.brokerage_per_order, turnover * 0.01 / 100)
        
        # Exchange charges (NSE)
        exchange_charges = turnover * self.nse_charges_rate
        
        # SEBI charges
        sebi_charges = turnover * self.sebi_charges_rate
        
        # STT (only on SELL)
        stt = turnover * self.stt_rate
        
        # GST (on brokerage + exchange charges)
        gst = (brokerage + exchange_charges) * self.gst_rate
        
        # Total
        total_exit_cost = brokerage + exchange_charges + sebi_charges + stt + gst
        
        return {
            'brokerage': round(brokerage, 2),
            'exchange_charges': round(exchange_charges, 2),
            'sebi_charges': round(sebi_charges, 2),
            'stt': round(stt, 2),
            'gst': round(gst, 2),
            'total': round(total_exit_cost, 2)
        }
    
    
    def calculate_trade_pnl(self, entry_price, exit_price, action='BUY', lot_size=75, lots=1):
        """
        Calculate complete P&L including ALL costs
        
        Args:
            entry_price: Entry price
            exit_price: Exit price
            action: 'BUY' or 'SELL'
            lot_size: 75 for NIFTY
            lots: Number of lots (1, 2, etc.)
        
        Returns:
            dict with gross P&L, costs, and net P&L
        """
        total_qty = lot_size * lots
        
        # Gross P&L
        if action == 'BUY':
            gross_pnl = (exit_price - entry_price) * total_qty
            entry_costs = self.calculate_entry_costs(entry_price, total_qty)
            exit_costs = self.calculate_exit_costs(exit_price, total_qty)
        else:  # SELL
            gross_pnl = (entry_price - exit_price) * total_qty
            entry_costs = self.calculate_exit_costs(entry_price, total_qty)
            exit_costs = self.calculate_entry_costs(exit_price, total_qty)
        
        total_costs = entry_costs['total'] + exit_costs['total']
        net_pnl = gross_pnl - total_costs
        
        return {
            'gross_pnl': round(gross_pnl, 2),
            'entry_costs': entry_costs,
            'exit_costs': exit_costs,
            'total_costs': round(total_costs, 2),
            'net_pnl': round(net_pnl, 2)
        }
    
    
    def calculate_slippage(self, price, action='BUY'):
        """
        Simulate realistic slippage
        
        Args:
            price: Intended price
            action: 'BUY' or 'SELL'
        
        Returns:
            Actual execution price (with slippage)
        """
        # NIFTY: typically 1-3 points slippage
        import random
        slippage_points = random.uniform(0.5, 2.5)
        
        if action == 'BUY':
            actual_price = price + slippage_points  # Buy slightly higher
        else:
            actual_price = price - slippage_points  # Sell slightly lower
        
        return round(actual_price, 2)


# Test
if __name__ == "__main__":
    print("\n" + "="*80)
    print("TESTING COST CALCULATOR".center(80))
    print("="*80 + "\n")
    
    calc = CostCalculator()
    
    # Example: BUY @ 25000, SELL @ 25100 (₹100 profit per qty)
    entry = 25000
    exit = 25100
    
    print(f"📊 Trade Example:")
    print(f"   BUY  1 Lot @ ₹{entry}")
    print(f"   SELL 1 Lot @ ₹{exit}")
    print(f"   Lot Size: 75")
    print(f"   Gross Points: +{exit - entry}")
    
    result = calc.calculate_trade_pnl(entry, exit, 'BUY', lot_size=75, lots=1)
    
    print(f"\n💰 P&L Breakdown:")
    print(f"   Gross P&L:     ₹{result['gross_pnl']:>+10,.2f}")
    print(f"\n   Entry Costs:")
    for key, value in result['entry_costs'].items():
        print(f"     {key:20s} ₹{value:>8,.2f}")
    print(f"\n   Exit Costs:")
    for key, value in result['exit_costs'].items():
        print(f"     {key:20s} ₹{value:>8,.2f}")
    print(f"\n   Total Costs:   ₹{result['total_costs']:>-10,.2f}")
    print(f"   ─────────────────────────────────")
    print(f"   NET P&L:       ₹{result['net_pnl']:>+10,.2f}")
    
    print(f"\n💡 Analysis:")
    print(f"   Points captured: {exit - entry}")
    print(f"   Points lost to costs: {result['total_costs'] / 75:.2f}")
    print(f"   Effective points: {result['net_pnl'] / 75:.2f}")
    
    print("\n✅ Cost calculator working!")
