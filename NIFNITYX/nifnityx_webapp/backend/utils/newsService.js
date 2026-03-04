import axios from "axios";
import News from "../models/News.js";

const GNEWS_API_KEY = "3933d620f8b6e0b563833061244d2aa2";
const GNEWS_BASE_URL = "https://gnews.io/api/v4/search";

const positiveWords = new Set([
  'surge', 'rally', 'gain', 'rise', 'jump', 'soar', 'climb', 'boost',
  'recovery', 'growth', 'profit', 'bullish', 'optimistic', 'breakout',
  'strength', 'strong', 'beat', 'outperform', 'record', 'high', 'buying'
]);

const negativeWords = new Set([
  'fall', 'drop', 'plunge', 'crash', 'decline', 'slide', 'tumble',
  'loss', 'bearish', 'pessimistic', 'downgrade', 'weak', 'fear',
  'concern', 'risk', 'crisis', 'sell', 'selling', 'pressure', 'recession'
]);

const categorizeNews = (text) => {
  text = text.toLowerCase();
  if (text.includes('bank nifty') || text.includes('banking')) return 'BANKNIFTY';
  if (text.includes('fii') || text.includes('dii') || text.includes('foreign')) return 'FII_DII';
  if (text.includes('rbi') || text.includes('reserve bank') || text.includes('monetary')) return 'RBI';
  if (text.includes('global') || text.includes('us market') || text.includes('dow')) return 'GLOBAL';
  if (text.includes('earnings') || text.includes('results') || text.includes('profit')) return 'EARNINGS';
  if (text.includes('war') || text.includes('conflict') || text.includes('geopolitical')) return 'GEOPOLITICAL';
  if (text.includes('nifty') || text.includes('sensex')) return 'NIFTY50';
  return 'OTHER';
};

const calculateSentiment = (text) => {
  text = text.toLowerCase();
  const posCount = Array.from(positiveWords).filter(word => text.includes(word)).length;
  const negCount = Array.from(negativeWords).filter(word => text.includes(word)).length;
  const total = posCount + negCount;
  
  if (total === 0) return { score: 0, confidence: 0.3 };
  
  const score = (posCount - negCount) / total;
  const confidence = Math.min(total / 10, 1.0);
  
  return { score, confidence };
};

const getImpactLevel = (sentimentScore) => {
  const abs = Math.abs(sentimentScore);
  if (abs > 0.6) return 'high';
  if (abs > 0.3) return 'medium';
  return 'low';
};

const getSentimentLabel = (score) => {
  if (score > 0.2) return 'bullish';
  if (score < -0.2) return 'bearish';
  return 'neutral';
};

export const fetchAndStoreNews = async () => {
  try {
    console.log('📰 Fetching news from GNews API...');

    const response = await axios.get(GNEWS_BASE_URL, {
      params: {
        q: 'india stock market OR sensex OR nifty OR BSE OR NSE',
        lang: 'en',
        max: 10,
        apikey: GNEWS_API_KEY
      },
      timeout: 10000
    });

    console.log('   API Response Status:', response.status);
    console.log('   Articles received:', response.data?.articles?.length || 0);

    if (response.status !== 200 || !response.data.articles) {
      console.log('⚠️  No articles fetched from GNews API');
      console.log('   Response data:', JSON.stringify(response.data).substring(0, 200));
      return { stored: 0, skipped: 0 };
    }

    const articles = response.data.articles;
    let stored = 0;
    let skipped = 0;

    for (const article of articles) {
      const title = article.title || '';
      const desc = article.description || '';
      const text = `${title} ${desc}`;

      const exists = await News.findOne({ source_url: article.url });
      if (exists) {
        skipped++;
        continue;
      }

      const sentiment = calculateSentiment(text);
      const publishedAt = new Date(article.publishedAt || Date.now());

      await News.create({
        headline: title,
        summary: desc,
        source_name: article.source?.name || 'Unknown',
        source_url: article.url,
        published_at: publishedAt,
        category: categorizeNews(text),
        sentiment_score: sentiment.score,
        sentiment_label: getSentimentLabel(sentiment.score),
        sentiment_confidence: sentiment.confidence,
        impact_level: getImpactLevel(sentiment.score),
        date_key: publishedAt.toISOString().split('T')[0],
      });

      stored++;
    }

    console.log(`📰 News fetched: ${stored} stored, ${skipped} skipped`);
    return { stored, skipped };
  } catch (error) {
    console.error('❌ Error fetching news:', error.message);
    if (error.response) {
      console.error('   API Error Response:', error.response.status, error.response.data);
    }
    return { stored: 0, skipped: 0, error: error.message };
  }
};

export const startNewsScheduler = () => {
  console.log('📰 News scheduler started (every 15 minutes)');
  
  fetchAndStoreNews();
  
  setInterval(() => {
    fetchAndStoreNews();
  }, 15 * 60 * 1000);
};
