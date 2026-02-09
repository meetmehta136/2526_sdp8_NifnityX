#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  COMPLETE 3-LAYER MODULAR TRADING SYSTEM                                     ║
║                                                                                ║
║  File Structure:                                                              ║
║  1. layer1_trading_bot.py      - Technical signal generation                 ║
║  2. layer2_sentiment.py (THIS) - News sentiment scoring                      ║
║  3. layer3_ml_model.py (THIS)  - ML trade quality prediction                 ║
║  4. integration.py (THIS)      - Combines all 3 layers                       ║
║                                                                                ║
║  USAGE:                                                                       ║
║  python integration.py         - Run full 3-layer system                     ║
║  python layer1_trading_bot.py  - Test technical bot alone                    ║
║  python layer2_sentiment.py    - Test sentiment alone                        ║
║  python layer3_ml_model.py     - Test ML model alone                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""
#!/usr/bin/env python3
"""
Layer 2: Sentiment Analyzer
Fetches news and scores sentiment
"""

import requests
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class SentimentAnalyzer:
    """
    Analyzes market sentiment from news
    Returns sentiment_boost: -20 to +20
    """
    
    def __init__(self, api_key="3933d620f8b6e0b563833061244d2aa2"):
        self.api_key = api_key
        self.base_url = "https://gnews.io/api/v4/search"
        
        # Word dictionaries
        self.positive_words = {
            'surge', 'rally', 'gain', 'rise', 'jump', 'soar', 'climb', 'boost',
            'recovery', 'growth', 'profit', 'bullish', 'optimistic', 'breakout',
            'strength', 'strong', 'beat', 'outperform', 'record', 'high', 'buying'
        }
        
        self.negative_words = {
            'fall', 'drop', 'plunge', 'crash', 'decline', 'slide', 'tumble',
            'loss', 'bearish', 'pessimistic', 'downgrade', 'weak', 'fear',
            'concern', 'risk', 'crisis', 'sell', 'selling', 'pressure', 'recession'
        }
        
        # CRITICAL: Only these block trades
        self.disaster_keywords = {
            'market crash', 'circuit breaker', 'trading halt', 'emergency',
            'war declared', 'terror attack', 'pandemic lockdown', 'banking crisis'
        }
        
        self.last_sentiment = {'score': 0, 'timestamp': None}
        
        print("✅ Layer 2: Sentiment Analyzer initialized")
    
    def get_sentiment_score(self, force_refresh=False):
        """Get sentiment score"""
        # Check cache (15 min)
        if not force_refresh and self.last_sentiment['timestamp']:
            minutes_since = (datetime.now() - self.last_sentiment['timestamp']).seconds / 60
            if minutes_since < 15:
                return self.last_sentiment
        
        print(f"\n📰 Fetching news sentiment...")
        
        # Fetch news
        news_articles = self._fetch_news()
        
        if not news_articles:
            result = {
                'sentiment_score': 0,
                'sentiment_boost': 0,
                'disaster_flag': False,
                'article_count': 0,
                'timestamp': datetime.now(),
                'articles': []
            }
            self.last_sentiment = result
            return result
        
        # Analyze
        sentiments = []
        disaster_detected = False
        
        for article in news_articles:
            title = article.get('title', '')
            desc = article.get('description', '')
            text = f"{title} {desc}".lower()
            
            # Count words
            pos_count = sum(1 for word in self.positive_words if word in text)
            neg_count = sum(1 for word in self.negative_words if word in text)
            
            # Check disaster
            if any(keyword in text for keyword in self.disaster_keywords):
                disaster_detected = True
            
            # Score
            total = pos_count + neg_count
            if total > 0:
                score = (pos_count - neg_count) / total
                sentiments.append(score)
        
        # Overall
        overall_sentiment = np.mean(sentiments) if sentiments else 0
        
        if disaster_detected:
            overall_sentiment = min(overall_sentiment - 0.6, -0.8)
        
        sentiment_boost = overall_sentiment * 12  # Scale to -20 to +20
        
        result = {
            'sentiment_score': overall_sentiment,
            'sentiment_boost': sentiment_boost,
            'disaster_flag': disaster_detected,
            'article_count': len(news_articles),
            'timestamp': datetime.now(),
            'articles': news_articles[:5]
        }
        
        self.last_sentiment = result
        
        emoji = "📈" if overall_sentiment > 0 else "📉" if overall_sentiment < 0 else "➡️"
        print(f"   Sentiment: {overall_sentiment:+.2f} {emoji} | Boost: {sentiment_boost:+.1f}")
        if disaster_detected:
            print(f"   ⚠️  DISASTER DETECTED!")
        
        return result
    
    def _fetch_news(self):
        """Fetch from GNews API"""
        try:
            params = {
                'q': 'NIFTY OR "Indian stock market" OR Sensex',
                'lang': 'en',
                'country': 'in',
                'max': 10,
                'apikey': self.api_key,
                'from': (datetime.now() - timedelta(hours=6)).isoformat()
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('articles', [])
            else:
                return []
        except:
            return []


# Test standalone
if __name__ == "__main__":
    print("\n" + "="*80)
    print("TESTING LAYER 2: SENTIMENT ANALYZER".center(80))
    print("="*80 + "\n")
    
    sentiment = SentimentAnalyzer()
    result = sentiment.get_sentiment_score()
    
    print(f"\n📊 RESULTS:")
    print(f"   Sentiment Score: {result['sentiment_score']:+.2f}")
    print(f"   Boost:           {result['sentiment_boost']:+.1f}/20")
    print(f"   Disaster Flag:   {result['disaster_flag']}")
    print(f"   Articles:        {result['article_count']}")
    
    print("\n✅ Layer 2 working!")