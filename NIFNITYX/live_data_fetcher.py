#!/usr/bin/env python3
"""
Angel One Live Data Fetcher
PAPER TRADING ONLY - NO ORDER EXECUTION
"""

import pyotp
import requests
import pandas as pd
from datetime import datetime, timedelta
import time
import json

class AngelOneDataFetcher:
    """
    Fetches LIVE data from Angel One
    ⚠️  READ-ONLY MODE - NO TRADING CAPABILITIES
    """
    
    def __init__(self, api_key, client_code, password, totp_secret):
        self.api_key = api_key
        self.client_code = client_code
        self.password = password
        self.totp_secret = totp_secret
        
        self.base_url = "https://apiconnect.angelbroking.com"
        self.auth_token = None
        self.feed_token = None
        
        # NIFTY 50 token
        self.nifty_token = "99926000"  # NIFTY 50 index
        self.exchange = "NSE"
        
        # 🔒 SAFETY: Paper trading mode (CANNOT BE DISABLED)
        self.PAPER_TRADING_MODE = True
        self.ORDER_PLACEMENT_DISABLED = True
        
        print("🔒 SAFETY: Paper Trading Mode - NO REAL ORDERS POSSIBLE")
        print("✅ Angel One Data Fetcher initialized (READ-ONLY)")
    
    
    def login(self):
        """Login to Angel One"""
        try:
            # Generate TOTP
            totp = pyotp.TOTP(self.totp_secret)
            totp_code = totp.now()
            
            # Login request
            url = f"{self.base_url}/rest/auth/angelbroking/user/v1/loginByPassword"
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': '00:00:00:00:00:00',
                'X-PrivateKey': self.api_key
            }
            
            payload = {
                'clientcode': self.client_code,
                'password': self.password,
                'totp': totp_code
            }
            
            response = requests.post(url, json=payload, headers=headers)
            data = response.json()
            
            if data['status']:
                self.auth_token = data['data']['jwtToken']
                self.feed_token = data['data']['feedToken']
                print(f"✅ Logged in successfully")
                print(f"   Session valid till market close")
                return True
            else:
                print(f"❌ Login failed: {data.get('message', 'Unknown error')}")
                return False
        
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    
    def get_ltp(self):
        """Get Last Traded Price of NIFTY"""
        try:
            url = f"{self.base_url}/rest/secure/angelbroking/order/v1/getLtpData"
            
            headers = {
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': '00:00:00:00:00:00',
                'X-PrivateKey': self.api_key
            }
            
            payload = {
                "exchange": self.exchange,
                "tradingsymbol": "NIFTY",
                "symboltoken": self.nifty_token
            }
            
            response = requests.post(url, json=payload, headers=headers)
            data = response.json()
            
            if data['status']:
                ltp = float(data['data']['ltp'])
                return ltp
            else:
                print(f"⚠️  LTP fetch failed: {data.get('message')}")
                return None
        
        except Exception as e:
            print(f"⚠️  LTP error: {e}")
            return None
    
    
    def get_current_candle(self):
        """Get current 1-min candle data"""
        try:
            url = f"{self.base_url}/rest/secure/angelbroking/historical/v1/getCandleData"
            
            headers = {
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': '00:00:00:00:00:00',
                'X-PrivateKey': self.api_key
            }
            
            # Last 2 candles
            to_date = datetime.now()
            from_date = to_date - timedelta(minutes=5)
            
            payload = {
                "exchange": self.exchange,
                "symboltoken": self.nifty_token,
                "interval": "ONE_MINUTE",
                "fromdate": from_date.strftime("%Y-%m-%d %H:%M"),
                "todate": to_date.strftime("%Y-%m-%d %H:%M")
            }
            
            response = requests.post(url, json=payload, headers=headers)
            data = response.json()
            
            if data['status'] and data['data']:
                # Last complete candle
                candle = data['data'][-1]
                
                return {
                    'timestamp': candle[0],
                    'open': float(candle[1]),
                    'high': float(candle[2]),
                    'low': float(candle[3]),
                    'close': float(candle[4]),
                    'volume': int(candle[5])
                }
            else:
                return None
        
        except Exception as e:
            print(f"⚠️  Candle fetch error: {e}")
            return None
    
    
    def get_historical_data(self, days=1):
        """Get historical 1-min data for backtesting/warmup"""
        try:
            url = f"{self.base_url}/rest/secure/angelbroking/historical/v1/getCandleData"
            
            headers = {
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': '00:00:00:00:00:00',
                'X-PrivateKey': self.api_key
            }
            
            to_date = datetime.now()
            from_date = to_date - timedelta(days=days)
            
            payload = {
                "exchange": self.exchange,
                "symboltoken": self.nifty_token,
                "interval": "ONE_MINUTE",
                "fromdate": from_date.strftime("%Y-%m-%d 09:15"),
                "todate": to_date.strftime("%Y-%m-%d %H:%M")
            }
            
            response = requests.post(url, json=payload, headers=headers)
            data = response.json()
            
            if data['status'] and data['data']:
                df = pd.DataFrame(data['data'], 
                                columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df = df.sort_values('timestamp')
                return df
            else:
                return None
        
        except Exception as e:
            print(f"⚠️  Historical data error: {e}")
            return None
    
    
    def place_order(self, *args, **kwargs):
        """
        🔒 DISABLED FOR PAPER TRADING
        This function CANNOT execute real orders
        """
        raise Exception("🚨 ORDER PLACEMENT DISABLED - PAPER TRADING MODE ONLY")
    
    
    def is_market_open(self):
        """Check if market is currently open"""
        now = datetime.now()
        
        # Monday to Friday
        if now.weekday() > 4:
            return False
        
        # 9:15 AM to 3:30 PM
        market_open = now.replace(hour=9, minute=15, second=0)
        market_close = now.replace(hour=15, minute=30, second=0)
        
        return market_open <= now <= market_close


# Test
if __name__ == "__main__":
    print("\n" + "="*80)
    print("TESTING ANGEL ONE DATA FETCHER".center(80))
    print("="*80 + "\n")
    
    # Your credentials (will be encrypted in production)
    API_KEY = "fTfdFxAZ"
    SECRET_KEY = "7ac06755-74e5-4ec3-9ec9-391a3b6784dc"
    CLIENT_CODE = "AAAM659971"
    PASSWORD = "9778"
    TOTP_SECRET = "PI3IKVTFHM7KEGYCASLR237UVE"
    
    fetcher = AngelOneDataFetcher(API_KEY, CLIENT_CODE, PASSWORD, TOTP_SECRET)
    
    if fetcher.login():
        print("\n📊 Testing data fetch...")
        
        ltp = fetcher.get_ltp()
        if ltp:
            print(f"   NIFTY LTP: ₹{ltp:,.2f}")
        
        candle = fetcher.get_current_candle()
        if candle:
            print(f"\n   Latest 1-min candle:")
            print(f"   Time:   {candle['timestamp']}")
            print(f"   OHLC:   {candle['open']:.2f} / {candle['high']:.2f} / {candle['low']:.2f} / {candle['close']:.2f}")
            print(f"   Volume: {candle['volume']:,}")
        
        print(f"\n   Market Open: {fetcher.is_market_open()}")
        
        print("\n✅ Data fetcher working!")
    else:
        print("\n❌ Login failed - check credentials")
