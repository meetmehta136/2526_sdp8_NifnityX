import requests
import json
import time
import random
from datetime import datetime

# --- CONFIGURATION ---
# Ensure your Node.js backend is running on this port
DASHBOARD_URL = "http://localhost:5000/api/trades/webhook"

def generate_mock_trade():
    """Generates a realistic trade signal payload based on NifnityX specs"""
    
    strategies = ["Trend Bounce", "Gamma Scalp", "Breakout", "Sniper Reversal"]
    symbols = ["NIFTY 24500 CE", "NIFTY 24800 PE", "NIFTY 25000 CE", "BANKNIFTY 48000 PE"]
    
    # Random ID to prevent duplicate errors during testing
    trade_id = f"T-SIM-{int(time.time())}-{random.randint(100,999)}"
    
    return {
        "trade_id": trade_id,
        "status": "PENDING_APPROVAL", # Default state for the dashboard to react to
        "symbol": random.choice(symbols),
        "setup_name": random.choice(strategies),
        "entry": {
            "price": round(random.uniform(120.0, 250.0), 2),
            "time": datetime.utcnow().isoformat() + "Z"
        },
        "exit": {
            "price": 0,
            "time": None,
            "reason": None
        },
        "pnl": 0,
        "confidence_score": {
            "total": round(random.uniform(65.0, 95.0), 1),
            "max": 160, # As per new requirement
            "breakdown": {
                "technical": random.randint(40, 70),
                "sentiment": random.randint(-10, 20),
                "ml_model": random.randint(10, 40)
            }
        },
        "lots": random.randint(1, 4),
        "ml_adjustment": "1.0x",
        "is_paper": True # Mark as simulation
    }

def send_signal():
    print(f"🚀 Generating Signal...")
    trade_data = generate_mock_trade()
    
    print(f"📦 Payload: {trade_data['symbol']} | ID: {trade_data['trade_id']}")
    
    try:
        # Send POST request to Node.js Backend
        response = requests.post(DASHBOARD_URL, json=trade_data, timeout=5)
        
        if response.status_code == 200:
            print(f"✅ SUCCESS: Dashboard received signal.")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ FAILED: Dashboard rejected signal.")
            print(f"   Status: {response.status_code} | Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print(f"🚨 CONNECTION ERROR: Is the Node.js backend running at {DASHBOARD_URL}?")
    except Exception as e:
        print(f"⚠️ ERROR: {str(e)}")

if __name__ == "__main__":
    # You can run this in a loop or just once
    send_signal()
    # while True:
    #     send_signal()
    #     time.sleep(10)