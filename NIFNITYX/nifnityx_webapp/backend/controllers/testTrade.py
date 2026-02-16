"""
  NifnityX — Simple Trade Simulator
  
  Sends a random signal to the Backend.
  
  Behavior:
  - If Frontend/Admin is set to "MANUAL" -> Card appears as PENDING.
  - If Frontend/Admin is set to "AUTO"   -> Trade executes instantly (OPEN).
  
  Usage:
  python testTrade.py
"""

import requests, time, random, sys
from datetime import datetime, timezone

BASE = "http://localhost:5000/api"

def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def send_signal():
    tid = f"T-SIM-{int(time.time())}-{random.randint(100, 999)}"
    print(f"\n📤 Sending Signal ID: {tid} ...")
    
    # Random setups
    setup = random.choice(["Breakout", "Reversal", "Trend Follow"])
    direction = random.choice(["BULLISH", "BEARISH"])
    symbol = "NIFTY 25000 CE" if direction == "BULLISH" else "NIFTY 25000 PE"
    
    # Price close to market (assumption)
    entry_price = round(random.uniform(98.0, 102.0), 2)
    sl = round(entry_price * 0.9, 2)
    tp = round(entry_price * 1.2, 2)
    
    signal = {
        "trade_id": tid,
        "symbol": symbol, 
        "setup_name": setup,
        "direction": direction,
        "entry": {"price": entry_price, "time": now(), "stop_loss": sl, "target": tp},
        "confidence_score": {"total": 85, "breakdown": {"technical": 30, "sentiment": 30, "ml_model": 25}},
        "lots": 1,
        "constraints": {"slippage_per": 2.0}, # Relaxed slippage for testing
    }

    try:
        res = requests.post(f"{BASE}/trade/signal", json=signal)
        if res.status_code == 200:
            data = res.json()
            status = data.get("status", "UNKNOWN")
            msg = data.get("message", "Success")
            
            print(f"   ✅ Sent Successfully!")
            print(f"   ℹ️  Server Response: {msg}")
            
            if status == "OPEN":
                print("   🚀 Result: AUTO-EXECUTED (Order is OPEN)")
            elif status == "REJECTED":
                print("   🛑 Result: REJECTED (Check Slippage/Risk?)")
            else:
                print("   🕒 Result: PENDING APPROVAL (Manual Mode Active)")
                
        else:
            print(f"   ❌ Failed ({res.status_code}): {res.text}")
            
    except Exception as e:
        print(f"   🚨 Connection Error: {e}")
        print("      Ensure backend is running on localhost:5000")

if __name__ == "__main__":
    send_signal()