#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║         🎯 NifnityX DEMO SIGNAL GENERATOR — Interview/Presentation Mode      ║
║                                                                                ║
║  PURPOSE: Generate realistic trading signals every ~20 seconds to               ║
║  showcase the NifnityX platform during demos. No ML model or real               ║
║  strategy needed — this is a pure signal simulator.                             ║
║                                                                                ║
║  FEATURES:                                                                     ║
║  ✓ Fires 1 signal every ~20 seconds (configurable)                             ║
║  ✓ ~70% win rate with realistic P&L distribution                               ║
║  ✓ Uses 2025 NIFTY 50 price range (22,000–24,500)                              ║
║  ✓ Realistic 3-layer scores (Technical + Sentiment + ML)                       ║
║  ✓ Strategies rotate: sniper, balanced, aggressive, conservative               ║
║  ✓ Auto-executes and auto-exits (no user approval needed)                      ║
║  ✓ Sends proper payloads to Node.js backend                                    ║
║                                                                                ║
║  Usage:                                                                        ║
║    python demo_simulation.py                                                   ║
║    python demo_simulation.py --interval 15  (signal every 15s)                 ║
║    python demo_simulation.py --win-rate 0.75 (75% profitable)                  ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import os
import time
import json
import random
import threading
import warnings
import requests
import urllib3
import socket
import argparse

from datetime import datetime, timedelta

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
warnings.filterwarnings('ignore')

# ── Configuration ──
NODE_API_URL = "http://localhost:5000/api/trade"
NODE_SECRET = "nifnityx-python-key"

try:
    import config
    NODE_API_URL = config.NODE_API_URL
    NODE_SECRET = config.NODE_SECRET
except ImportError:
    pass

# ══════════════════════════════════════════════════════════════════════════════
#  REALISTIC NIFTY 2025 DATA
# ══════════════════════════════════════════════════════════════════════════════

# Real NIFTY 50 setups that the 3-layer system detects
SETUP_NAMES = [
    "EMA_CROSSOVER_MACD_CONFIRM",
    "RSI_OVERSOLD_BOUNCE",
    "VWAP_RECLAIM_MOMENTUM",
    "BOLLINGER_SQUEEZE_BREAKOUT",
    "SUPERTREND_REVERSAL",
    "MACD_DIVERGENCE_PULLBACK",
    "EMA_200_SUPPORT_BOUNCE",
    "RSI_OVERBOUGHT_REVERSAL",
    "DOUBLE_BOTTOM_BREAK",
    "VOLUME_SPIKE_BREAKOUT",
    "FIBONACCI_618_BOUNCE",
    "TRENDLINE_BREAK_RETEST",
]

STRATEGIES = ["sniper", "balanced", "aggressive", "conservative"]

# Realistic 2025 NIFTY price paths by month (open range)
MONTHLY_PRICE_RANGES = {
    1: (23200, 24100),   # Jan 2025
    2: (22800, 23600),   # Feb 2025
    3: (22100, 23200),   # Mar 2025
    4: (23400, 24400),   # Apr 2025
    5: (24000, 24800),   # May 2025
    6: (23500, 24200),   # Jun 2025
    7: (24100, 25000),   # Jul 2025
    8: (23800, 24600),   # Aug 2025
    9: (24200, 25100),   # Sep 2025
    10: (24500, 25300),  # Oct 2025
    11: (23900, 24700),  # Nov 2025
    12: (24000, 24900),  # Dec 2025
}


class DemoSignalGenerator:
    """
    Generates realistic trading signals at configurable intervals.
    Designed for demo/presentation mode — NOT for actual trading.
    """

    def __init__(self, interval=20, win_rate=0.70, auto_exit_delay=8):
        self.interval = interval           # Seconds between signals
        self.win_rate = win_rate           # Target win rate (0.0 to 1.0)
        self.auto_exit_delay = auto_exit_delay  # Seconds before auto-exit
        self.signal_count = 0
        self.wins = 0
        self.losses = 0
        self.total_pnl = 0
        self.running = False
        self.current_price = 23800.0       # Starting price
        self.capital = 100000

        # Simulate a realistic date progression through 2025
        self.sim_date = datetime(2025, 1, 6, 9, 20, 0)  # First Monday of 2025

        print("""
╔════════════════════════════════════════════════════════════════════════════════╗
║         🎯 NifnityX DEMO SIGNAL GENERATOR                                    ║
║                                                                                ║
║  Interval:     {} seconds between signals                                      
║  Win Rate:     {:.0f}% target                                                  
║  Auto-Exit:    {} seconds after entry                                          
║  Starting:     ₹{:,.2f}                                                        
╚════════════════════════════════════════════════════════════════════════════════╝
""".format(interval, win_rate * 100, auto_exit_delay, self.current_price))

    def _get_price_for_date(self):
        """Get a realistic NIFTY price based on the simulated month."""
        month = self.sim_date.month
        low, high = MONTHLY_PRICE_RANGES.get(month, (23500, 24500))
        # Random walk around current price, clamped to monthly range
        move = random.gauss(0, 15)  # ~15 point std deviation
        self.current_price = max(low, min(high, self.current_price + move))
        return round(self.current_price, 2)

    def _advance_time(self):
        """Advance simulated time by a realistic amount."""
        # Move forward 15-45 minutes in simulated time
        minutes_advance = random.randint(15, 45)
        self.sim_date += timedelta(minutes=minutes_advance)

        # If past market close (15:30), jump to next market day 9:20
        if self.sim_date.hour >= 15 and self.sim_date.minute > 30:
            # Skip to next day
            self.sim_date += timedelta(days=1)
            self.sim_date = self.sim_date.replace(hour=9, minute=20, second=0)

        # Skip weekends
        while self.sim_date.weekday() >= 5:  # Sat=5, Sun=6
            self.sim_date += timedelta(days=1)

    def _generate_scores(self, is_winner):
        """Generate realistic 3-layer scores. Winners get higher scores."""
        if is_winner:
            technical = random.uniform(55, 85)
            sentiment = random.uniform(2, 12)
            ml_score = random.uniform(22, 38)
        else:
            technical = random.uniform(35, 65)
            sentiment = random.uniform(-5, 8)
            ml_score = random.uniform(12, 28)

        return {
            "technical": round(technical, 1),
            "sentiment": round(sentiment, 1),
            "ml_model": round(ml_score, 1),
        }

    def _generate_pnl(self, is_winner, entry_price, lots):
        """Generate a realistic P&L value."""
        POINT_VALUE = 75  # NIFTY: 1 point = ₹75 per lot
        if is_winner:
            points = random.uniform(8, 45)  # 8–45 point gain
        else:
            points = random.uniform(-35, -5)  # 5–35 point loss

        gross_pnl = points * lots * POINT_VALUE
        costs = random.uniform(35, 55)  # Brokerage + STT + fees
        net_pnl = gross_pnl - costs
        return round(net_pnl, 2), round(gross_pnl, 2), round(costs, 2)

    def generate_signal(self):
        """Generate one complete signal cycle: entry → wait → exit."""
        self.signal_count += 1
        self._advance_time()

        entry_price = self._get_price_for_date()
        is_buy = random.random() > 0.45  # Slight long bias
        action = "BUY" if is_buy else "SELL"
        setup = random.choice(SETUP_NAMES)
        strategy = random.choice(STRATEGIES)
        lots = random.choice([1, 1, 1, 2, 2])  # Most are 1-2 lots

        # Determine win/loss
        # Use running average to stay close to target win rate
        current_rate = self.wins / max(self.signal_count - 1, 1) if self.signal_count > 1 else self.win_rate
        if current_rate < self.win_rate - 0.05:
            is_winner = random.random() < 0.85  # Bias towards win to catch up
        elif current_rate > self.win_rate + 0.05:
            is_winner = random.random() < 0.45  # Bias towards loss to correct
        else:
            is_winner = random.random() < self.win_rate

        scores = self._generate_scores(is_winner)
        final_score = scores["technical"] + scores["sentiment"] + scores["ml_model"]

        # Stop loss and target
        sl_distance = random.uniform(15, 40)
        target_distance = sl_distance * random.uniform(1.5, 2.5)

        if is_buy:
            stop_loss = entry_price - sl_distance
            target = entry_price + target_distance
        else:
            stop_loss = entry_price + sl_distance
            target = entry_price - target_distance

        trade_id = f"DEMO-{self.sim_date.strftime('%Y%m%d')}-{self.signal_count:04d}"

        # ── Build signal payload ──
        payload = {
            "trade_id": trade_id,
            "symbol": "NIFTY",
            "action": action,
            "setup_name": setup,
            "strategy": strategy,
            "entry": {
                "price": entry_price,
                "time": self.sim_date.isoformat(),
                "stop_loss": round(stop_loss, 2),
                "target": round(target, 2),
            },
            "confidence_score": {
                "total": round(final_score, 1),
                "max": 160,
                "breakdown": scores,
            },
            "lots": lots,
            "lots_exact": float(lots),
            "constraints": {"slippage_per": 0.5},
            "execution_mode": "auto",
        }

        print(f"\n{'='*70}")
        print(f"🎯 SIGNAL #{self.signal_count}  [{strategy.upper()}]  {self.sim_date.strftime('%Y-%m-%d %H:%M')}")
        print(f"   {action} NIFTY @ ₹{entry_price:,.2f} | {lots} lot(s)")
        print(f"   SL: ₹{stop_loss:,.2f} | Target: ₹{target:,.2f} | Setup: {setup}")
        print(f"   Score: {final_score:.1f}/160 (T:{scores['technical']:.1f} S:{scores['sentiment']:.1f} ML:{scores['ml_model']:.1f})")

        # ── Send to Node.js ──
        try:
            r = requests.post(
                f"{NODE_API_URL}/signal",
                json=payload,
                headers={"x-python-secret": NODE_SECRET},
                timeout=5,
                verify=False,
            )
            if r.status_code == 200 or r.status_code == 201:
                print(f"   📡 Signal sent to Mission Control ✓")
            else:
                print(f"   ⚠️  Webhook returned {r.status_code}: {r.text[:100]}")
        except Exception as e:
            print(f"   ⚠️  Could not reach Mission Control: {e}")
            return

        # ── Schedule auto-exit ──
        exit_delay = self.auto_exit_delay + random.uniform(-2, 3)
        threading.Timer(max(exit_delay, 3), self._auto_exit, args=[trade_id, entry_price, is_winner, action, lots, strategy]).start()

    def _auto_exit(self, trade_id, entry_price, is_winner, action, lots, strategy):
        """Auto-exit a trade after delay — send exit update to Node.js."""
        net_pnl, gross_pnl, costs = self._generate_pnl(is_winner, entry_price, lots)

        if is_winner:
            self.wins += 1
            if action == "BUY":
                exit_price = entry_price + abs(gross_pnl) / (lots * 75)
            else:
                exit_price = entry_price - abs(gross_pnl) / (lots * 75)
        else:
            self.losses += 1
            if action == "BUY":
                exit_price = entry_price - abs(gross_pnl) / (lots * 75)
            else:
                exit_price = entry_price + abs(gross_pnl) / (lots * 75)

        exit_price = round(exit_price, 2)
        self.total_pnl += net_pnl
        self.capital += net_pnl

        # Advance sim time for exit
        self._advance_time()
        exit_time = self.sim_date

        status = "WIN" if is_winner else "LOSS"
        icon = "✅" if is_winner else "❌"

        update_payload = {
            "trade_id": trade_id,
            "status": status,
            "exit": {
                "price": exit_price,
                "time": exit_time.isoformat(),
                "reason": "TARGET_HIT" if is_winner else "STOP_HIT",
            },
            "pnl": net_pnl,
            "gross_pnl": gross_pnl,
            "total_costs": costs,
            "won": is_winner,
        }

        try:
            r = requests.post(
                f"{NODE_API_URL}/update",
                json=update_payload,
                headers={"x-python-secret": NODE_SECRET},
                timeout=5,
                verify=False,
            )
            win_rate = (self.wins / (self.wins + self.losses)) * 100 if (self.wins + self.losses) > 0 else 0
            print(f"\n   {icon} {status}: {trade_id} | P&L: ₹{net_pnl:+,.2f}")
            print(f"   📊 Running: {self.wins}W/{self.losses}L ({win_rate:.0f}%) | Total P&L: ₹{self.total_pnl:+,.2f}")
        except Exception as e:
            print(f"   ⚠️  Could not send exit update: {e}")

    def run(self):
        """Main loop — generates signals at the configured interval."""
        self.running = True
        print(f"\n🚀 Starting demo signal generator (Ctrl+C to stop)")
        print(f"   Signals every {self.interval}s | Target {self.win_rate*100:.0f}% win rate\n")

        try:
            while self.running:
                self.generate_signal()

                # Wait for next signal with countdown
                for remaining in range(self.interval, 0, -1):
                    print(f"\r   ⏱  Next signal in {remaining}s...", end="", flush=True)
                    time.sleep(1)
                print("\r" + " " * 40 + "\r", end="", flush=True)

        except KeyboardInterrupt:
            print(f"\n\n⏹️  Demo stopped by user")
            self._print_summary()

    def _print_summary(self):
        total = self.wins + self.losses
        win_rate = (self.wins / total * 100) if total > 0 else 0
        print(f"\n{'='*60}")
        print(f"📊 DEMO SESSION SUMMARY")
        print(f"{'='*60}")
        print(f"   Signals:    {self.signal_count}")
        print(f"   Wins:       {self.wins}")
        print(f"   Losses:     {self.losses}")
        print(f"   Win Rate:   {win_rate:.1f}%")
        print(f"   Total P&L:  ₹{self.total_pnl:+,.2f}")
        print(f"   Capital:    ₹{self.capital:,.2f}")
        print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="NifnityX Demo Signal Generator — fires realistic trading signals for demos",
    )
    parser.add_argument("--interval", type=int, default=20,
                        help="Seconds between signals (default: 20)")
    parser.add_argument("--win-rate", type=float, default=0.70,
                        help="Target win rate 0.0-1.0 (default: 0.70)")
    parser.add_argument("--exit-delay", type=int, default=8,
                        help="Seconds before auto-exit (default: 8)")
    args = parser.parse_args()

    gen = DemoSignalGenerator(
        interval=args.interval,
        win_rate=args.win_rate,
        auto_exit_delay=args.exit_delay,
    )
    gen.run()


if __name__ == "__main__":
    main()
