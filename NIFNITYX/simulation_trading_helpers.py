"""
Simulation Trading Helper Methods

This file contains helper methods for the simulation trading system.
These methods handle trade exit checking and other utility functions.
"""

def _check_and_exit_open_trades(self, candle, timestamp):
    """
    Check open positions for stop-loss or target hit conditions.
    This runs on EVERY candle to catch trades approved in previous candles.
    
    Args:
        candle: dict with 'high', 'low', 'close' prices
        timestamp: datetime of the current candle
    """
    if not hasattr(self, 'paper_engine') or not self.paper_engine:
        return
        
    open_positions = getattr(self.paper_engine, 'open_positions', [])
    if not open_positions:
        return
        
    current_price = candle['close']
    high_price = candle['high']
    low_price = candle['low']
    
    # Iterate backwards to safely remove positions
    positions_to_close = []
    
    for idx, pos in enumerate(open_positions):
        action = pos.get('action', '').upper()
        entry_price = pos.get('entry_price', 0)
        stop_loss = pos.get('stop_loss', 0)
        target = pos.get('target', 0)
        
        if not entry_price:
            continue
            
        exit_reason = None
        exit_price = None
        
        if action == 'BUY':
            # For BUY: SL hit if low <= SL, target hit if high >= target
            if stop_loss and low_price <= stop_loss:
                exit_reason = 'STOP_LOSS'
                exit_price = stop_loss
            elif target and high_price >= target:
                exit_reason = 'TARGET_HIT'
                exit_price = target
                
        elif action == 'SELL':
            # For SELL: SL hit if high >= SL, target hit if low <= target
            if stop_loss and high_price >= stop_loss:
                exit_reason = 'STOP_LOSS'
                exit_price = stop_loss
            elif target and low_price <= target:
                exit_reason = 'TARGET_HIT'
                exit_price = target
        
        if exit_reason and exit_price:
            positions_to_close.append((idx, exit_price, exit_reason))
    
    # Close positions in reverse order to maintain indices
    for idx, exit_price, exit_reason in reversed(positions_to_close):
        try:
            self.paper_engine.close_position(idx, exit_price, exit_reason, timestamp)
            print(f"🔴 Position closed: {exit_reason} @ ₹{exit_price:,.2f}")
        except Exception as e:
            print(f"⚠️ Error closing position: {e}")
