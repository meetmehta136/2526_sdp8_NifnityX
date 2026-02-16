#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║               🚀 LIVE PAPER TRADING SYSTEM - 3-LAYER NIFTY BOT                ║
║                  ⚠️  PAPER TRADING ONLY - NO REAL ORDERS                      ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import sys
import os
import time
import json
import pandas as pd
from datetime import datetime, timedelta
import warnings
import threading
import requests
import config
from fastapi import FastAPI
import uvicorn

# Disable SSL warnings globally
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
warnings.filterwarnings('ignore')

# Import all components
from live_data_fetcher import AngelOneDataFetcher
from cost_calculator import CostCalculator
from paper_trading_engine import PaperTradingEngine

# Import 3-layer system
from layer1_trading_bot import TradingBot
from layer2_sentiment import SentimentAnalyzer
from layer3_ml_model import EnhancedMLTradePredictor

print("""
╔════════════════════════════════════════════════════════════════════════════════╗
║               🚀 LIVE PAPER TRADING SYSTEM - NIFTY 3-LAYER BOT                ║
║                        Real Data • Paper Trading • Zero Risk                  ║
╚════════════════════════════════════════════════════════════════════════════════╝
""")

# ── FastAPI App & Global State ────────────────────────────────────────────────
app = FastAPI(title="NifnityX Trading Engine", version="1.0")
PENDING_SIGNALS = {}   # trade_id -> {signal, ltp, ml_score}
system = None          # Will hold the LivePaperTradingSystem instance

class LivePaperTradingSystem:
    """Complete live paper trading system"""
    
    def __init__(self):
        # Configuration
        self.API_KEY = "fTfdFxAZ"
        self.SECRET_KEY = "7ac06755-74e5-4ec3-9ec9-391a3b6784dc"
        self.CLIENT_CODE = "AAAM659971"
        self.PASSWORD = "9778"
        self.TOTP_SECRET = "PI3IKVTFHM7KEGYCASLR237UVE"
        
        self.INITIAL_CAPITAL = 100000
        self.MIN_SCORE = 60
        self.ML_BLOCK_THRESHOLD = 15
        
        # Create logs directory
        self.log_dir = f"paper_trading_logs/{datetime.now().strftime('%Y-%m-%d')}"
        os.makedirs(self.log_dir, exist_ok=True)
        
        # Initialize components
        print("\n🔧 Initializing components...")
        
        self.data_fetcher = AngelOneDataFetcher(
            self.API_KEY,
            self.CLIENT_CODE,
            self.PASSWORD,
            self.TOTP_SECRET
        )
        
        self.cost_calc = CostCalculator(brokerage_per_order=20)
        
        self.paper_engine = PaperTradingEngine(
            initial_capital=self.INITIAL_CAPITAL,
            cost_calculator=self.cost_calc
        )
        
        # 3-Layer system
        self.layer1 = TradingBot(capital=self.INITIAL_CAPITAL)
        self.layer2 = SentimentAnalyzer()
        self.layer3 = EnhancedMLTradePredictor(model_path='3layer_results_v5/ml_model_v6.pkl')
        
        # Historical data buffer
        self.historical_data = pd.DataFrame()
        self.last_candle_time = None
        
        # Tracking
        self.decisions_log = []
        
        print("\n✅ System initialized!")
        print(f"   Logs: {self.log_dir}/")
        print(f"   Capital: ₹{self.INITIAL_CAPITAL:,}")
    
    
    def login(self):
        """Login to Angel One"""
        print("\n🔐 Logging in to Angel One...")
        return self.data_fetcher.login()
    
    
    def warmup(self):
        """Load historical data for indicators"""
        print("\n📊 Loading historical data for indicators...")
        
        hist_data = self.data_fetcher.get_historical_data(days=5)
        
        if hist_data is not None and len(hist_data) > 0:
            # Prepare data for Layer 1
            hist_data = hist_data.rename(columns={'timestamp': 'datetime'})
            hist_data = hist_data.set_index('datetime')
            
            # Calculate indicators
            self.historical_data = self.layer1.calculate_indicators(hist_data)
            
            print(f"   Loaded {len(hist_data)} candles")
            print(f"   Date range: {hist_data.index.min()} to {hist_data.index.max()}")
            return True
        else:
            print("   ⚠️  Could not load historical data")
            return False
    
    
    def process_candle(self, candle):
        """Process a new 1-min candle"""
        
        # Create new row
        timestamp = pd.to_datetime(candle['timestamp'])
        new_row = pd.DataFrame([{
            'open': candle['open'],
            'high': candle['high'],
            'low': candle['low'],
            'close': candle['close'],
            'volume': candle['volume']
        }], index=[timestamp])
        
        # Add to historical data - FIXED: ignore_index changed to ignore_index=False
        self.historical_data = pd.concat([self.historical_data, new_row])
        self.historical_data = self.historical_data.tail(500)
        
        # Recalculate indicators
        self.historical_data = self.layer1.calculate_indicators(self.historical_data)
        
        # Generate signal
        idx = len(self.historical_data) - 1
        signal = self.layer1.generate_signal(self.historical_data, idx)
        
        if signal:
            print(f"\n🎯 SIGNAL GENERATED - {timestamp}")
            print(f"   {signal['action']} @ ₹{signal['price']:,.2f}")
            print(f"   Stop: ₹{signal['stop']:,.2f} | Target: ₹{signal['target']:,.2f}")
            print(f"   Setup: {signal.get('setup', 'unknown')}")
            
            # Evaluate with 3 layers
            self.evaluate_signal(signal, candle['close'])
        else:
            # Just update positions
            self.paper_engine.update_positions(candle['close'], datetime.now())
    
    
    def evaluate_signal(self, signal, current_price):
        """Evaluate signal using 3-layer system"""
        
        # Layer 1: Technical
        technical_score = signal.get('technical_score', 60)
        
        # Layer 2: Sentiment
        sentiment_data = self.layer2.get_sentiment_score()
        sentiment_score = sentiment_data['sentiment_boost']
        disaster_flag = sentiment_data['disaster_flag']
        
        # Layer 3: ML
        features = signal.get('features', {})
        ml_data = self.layer3.predict_trade_quality(features)
        ml_score = ml_data['ml_score']
        
        # Final score
        final_score = technical_score + sentiment_score + ml_score
        
        # Decision
        execute = False
        reason = []
        
        if ml_score < self.ML_BLOCK_THRESHOLD:
            execute = False
            reason.append(f"❌ ML too weak ({ml_score:.0f}/40)")
        elif disaster_flag:
            execute = False
            reason.append("🚨 DISASTER")
        elif final_score >= self.MIN_SCORE:
            execute = True
            if ml_score >= 22:
                reason.append(f"🔥 Strong ML: {ml_score:.0f}")
            else:
                reason.append(f"✅ Good ML: {ml_score:.0f}")
        else:
            execute = False
            reason.append(f"❌ Score {final_score:.1f}")
        
        decision = {
            'timestamp': datetime.now(),
            'signal': signal,
            'technical_score': technical_score,
            'sentiment_score': sentiment_score,
            'ml_score': ml_score,
            'final_score': final_score,
            'disaster_flag': disaster_flag,
            'execute': execute,
            'reason': ' | '.join(reason)
        }
        
        self.decisions_log.append(decision)
        
        print(f"\n📊 3-LAYER EVALUATION:")
        print(f"   Technical: {technical_score}/60")
        print(f"   Sentiment: {sentiment_score:+.1f}/20")
        print(f"   ML Score:  {ml_score:.1f}/40")
        print(f"   ─────────────────────")
        print(f"   FINAL:     {final_score:.1f}/120")
        print(f"   Decision:  {decision['reason']}")
        
        # Execute if approved — forward to Node.js Mission Control
        if execute:
            trade_id = f"T-{int(time.time())}"
            
            # ML-based lot sizing (mirrors engine logic)
            calculated_lots = 1
            if ml_score < 15:
                calculated_lots = 0.5
            elif ml_score < 22:
                calculated_lots = 0.75
            else:
                calculated_lots = 1.25
            calculated_lots = round(calculated_lots * 2) / 2
            if calculated_lots < 0.5:
                calculated_lots = 0.5
            
            payload = {
                "trade_id": trade_id,
                "symbol": "NIFTY",
                "setup_name": signal.get('setup', 'ML_Strategy'),
                "entry": {
                    "price": current_price,
                    "time": datetime.utcnow().isoformat(),
                    "stop_loss": signal.get('stop')
                },
                "confidence_score": {
                    "total": float(final_score),
                    "breakdown": {
                        "technical": float(technical_score),
                        "sentiment": float(sentiment_score),
                        "ml": float(ml_score)
                    }
                },
                "lots": int(calculated_lots),
                "constraints": {"slippage_per": 0.5}
            }
            
            # Store context for when Node.js approves execution
            PENDING_SIGNALS[trade_id] = {
                "signal": signal,
                "ltp": current_price,
                "ml_score": ml_score
            }
            
            # Send signal to Node.js Mission Control
            try:
                requests.post(
                    f"{config.NODE_API_URL}/signal",
                    json=payload,
                    headers={"x-python-secret": config.NODE_SECRET},
                    timeout=5,
                    verify=False
                )
                print(f"\n📡 Signal sent to Mission Control: {trade_id}")
            except Exception as e:
                print(f"\n⚠️  Could not reach Mission Control: {e}")
                # Fallback: execute directly if Node is unreachable
                print(f"   ↪ Executing trade locally as fallback...")
                result = self.paper_engine.execute_signal(signal, current_price, ml_score)
                if result:
                    result['trade_id'] = trade_id
                decision['execution_result'] = result
                PENDING_SIGNALS.pop(trade_id, None)
            
            # Original direct execution (now handled via webhook):
            # result = self.paper_engine.execute_signal(signal, current_price, ml_score)
            # decision['execution_result'] = result
        
        # Save decision
        self.save_decision(decision)
    
    
    def run_live(self):
        """Main live trading loop"""
        
        print("\n" + "="*80)
        print("🚀 STARTING LIVE PAPER TRADING".center(80))
        print("="*80)
        print(f"\n   Market Hours: 9:15 AM - 3:30 PM")
        print(f"   Checking every 60 seconds")
        print(f"   Press Ctrl+C to stop\n")
        
        try:
            while True:
                # Check if market is open
                if not self.data_fetcher.is_market_open():
                    print(f"\r⏸️  Market closed - Waiting... {datetime.now().strftime('%H:%M:%S')}", end='', flush=True)
                    time.sleep(60)
                    continue
                
                # Get current candle
                candle = self.data_fetcher.get_current_candle()
                
                if candle:
                    # Check if it's a new candle
                    if self.last_candle_time != candle['timestamp']:
                        self.last_candle_time = candle['timestamp']
                        
                        print(f"\n{'='*80}")
                        print(f"📊 {candle['timestamp']} | NIFTY: ₹{candle['close']:,.2f}")
                        print(f"{'='*80}")
                        
                        # Process candle
                        self.process_candle(candle)
                        
                        # Show status
                        self.show_status()
                    else:
                        print(f"\r⏳ Waiting for new candle... {datetime.now().strftime('%H:%M:%S')}", end='', flush=True)
                else:
                    print(f"\r⚠️  Data fetch failed {datetime.now().strftime('%H:%M:%S')}", end='', flush=True)
                
                # Wait 60 seconds
                time.sleep(60)
        
        except KeyboardInterrupt:
            print("\n\n⏹️  Stopped by user")
            self.end_of_day()
    
    
    def show_status(self):
        """Show current status"""
        stats = self.paper_engine.get_daily_stats()
        
        print(f"\n📈 TODAY'S STATS:")
        print(f"   Signals: {stats['signals_generated']} | Executed: {stats['signals_executed']}")
        print(f"   Trades: {stats['trades_completed']} | Win Rate: {stats['win_rate']:.1f}%")
        print(f"   Net P&L: ₹{stats['net_pnl']:+,.2f}")
        print(f"   Capital: ₹{stats['capital']:,.2f} ({stats['return_pct']:+.2f}%)")
        print(f"   Open: {stats['open_positions']}")
    
    
    def end_of_day(self):
        """End of day routine"""
        print("\n" + "="*80)
        print("📊 END OF DAY - CLOSING POSITIONS & GENERATING REPORT".center(80))
        print("="*80 + "\n")
        
        # Close all positions
        ltp = self.data_fetcher.get_ltp()
        if ltp:
            self.paper_engine.force_close_all(ltp, "EOD")
        
        # Generate report
        self.generate_daily_report()
        
        # Save trades
        self.paper_engine.save_trades(f"{self.log_dir}/trades.csv")
        
        print("\n✅ Day complete!")
    
    
    def save_decision(self, decision):
        """Save decision to log"""
        log_file = f"{self.log_dir}/decisions.jsonl"
        
        try:
            with open(log_file, 'a') as f:
                json.dump({
                    'timestamp': str(decision['timestamp']),
                    'action': decision['signal']['action'],
                    'price': decision['signal']['price'],
                    'technical_score': decision['technical_score'],
                    'sentiment_score': decision['sentiment_score'],
                    'ml_score': decision['ml_score'],
                    'final_score': decision['final_score'],
                    'execute': decision['execute'],
                    'reason': decision['reason']
                }, f)
                f.write('\n')
        except Exception as e:
            print(f"⚠️  Could not save decision: {e}")
    
    
    def generate_daily_report(self):
        """Generate end of day report"""
        stats = self.paper_engine.get_daily_stats()
        
        report = f"""
╔════════════════════════════════════════════════════════════════════════════════╗
║                   📊 DAILY PAPER TRADING REPORT                               ║
║                       {datetime.now().strftime('%Y-%m-%d')}                                              ║
╚════════════════════════════════════════════════════════════════════════════════╝

📈 PERFORMANCE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signals Generated:         {stats['signals_generated']}
Signals Executed:          {stats['signals_executed']}
Execution Rate:            {stats['signals_executed']/stats['signals_generated']*100 if stats['signals_generated'] > 0 else 0:.1f}%

Trades Completed:          {stats['trades_completed']}
Winning Trades:            {stats['wins']}
Losing Trades:             {stats['losses']}
Win Rate:                  {stats['win_rate']:.1f}%

💰 FINANCIAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gross P&L:                 ₹{stats['gross_pnl']:+,.2f}
Total Costs:               ₹{stats['costs']:,.2f}
Net P&L:                   ₹{stats['net_pnl']:+,.2f}

Starting Capital:          ₹{self.INITIAL_CAPITAL:,.2f}
Ending Capital:            ₹{stats['capital']:,.2f}
Return:                    {stats['return_pct']:+.2f}%

Open Positions:            {stats['open_positions']}

════════════════════════════════════════════════════════════════════════════════
"""
        
        # Save report
        with open(f"{self.log_dir}/daily_report.txt", 'w') as f:
            f.write(report)
        
        print(report)


# ── FastAPI Endpoints ─────────────────────────────────────────────────────────
@app.post("/execute")
def execute_trade(data: dict):
    """
    Node.js sends {"trade_id": "..."} to approve a pending trade.
    """
    trade_id = data.get("trade_id")
    
    if trade_id not in PENDING_SIGNALS:
        return {"status": "not_found", "message": f"No pending signal for {trade_id}"}
    
    # Retrieve stored context
    context = PENDING_SIGNALS.pop(trade_id)
    
    # Execute via the original engine method
    result = system.paper_engine.execute_signal(
        context['signal'],
        context['ltp'],
        context['ml_score']
    )
    
    # Force the trade_id to match Node's ID
    if result:
        result['trade_id'] = trade_id
    
    print(f"\n✅ Executed Trade {trade_id} via Webhook")
    return {"status": "executed", "trade_id": trade_id}


@app.post("/update_capital")
def update_capital(data: dict):
    """
    Node.js sends {"capital": 50000} to update engine capital.
    """
    new_capital = data.get("capital")
    if new_capital is not None and system:
        system.paper_engine.capital = float(new_capital)
        print(f"\n💰 Capital Updated: ₹{new_capital:,}")
        return {"status": "updated", "capital": new_capital}
    return {"status": "error", "message": "Missing capital value"}


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    stats = system.paper_engine.get_daily_stats() if system else {}
    return {
        "status": "running",
        "pending_signals": len(PENDING_SIGNALS),
        "engine_stats": stats
    }


def main():
    """Main entry point"""
    global system
    system = LivePaperTradingSystem()
    
    # Login
    if not system.login():
        print("❌ Login failed - check credentials")
        return
    
    # Warmup
    if not system.warmup():
        print("❌ Warmup failed - cannot proceed")
        return
    
    # Run trading loop in a background thread
    t = threading.Thread(target=system.run_live, daemon=True)
    t.start()
    
    print(f"\n🌐 FastAPI server starting on port {config.PYTHON_PORT}...")
    print(f"   Swagger UI: http://localhost:{config.PYTHON_PORT}/docs")
    print(f"   Health:     http://localhost:{config.PYTHON_PORT}/health")
    
    # Run FastAPI server on the main thread (blocks here)
    uvicorn.run(app, host="0.0.0.0", port=config.PYTHON_PORT)


if __name__ == "__main__":
    main()