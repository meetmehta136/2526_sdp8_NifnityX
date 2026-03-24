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

  let posCount = 0;
  let negCount = 0;

  Array.from(positiveWords).forEach(word => {
    const matches = text.match(new RegExp('\\b' + word + '\\b', 'g'));
    if (matches) posCount += matches.length;
  });

  Array.from(negativeWords).forEach(word => {
    const matches = text.match(new RegExp('\\b' + word + '\\b', 'g'));
    if (matches) negCount += matches.length;
  });

  const total = posCount + negCount;

  if (total === 0) return { score: 0, confidence: 0.1 };

  const score = (posCount - negCount) / total;
  const confidence = Math.min(0.3 + (total * 0.15), 1.0);

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

let cachedNews = null;
let lastFetchTime = null;

export const fetchLiveNews = async () => {
  try {
    const now = Date.now();
    // Use cache if less than 15 minutes old
    if (cachedNews && lastFetchTime && (now - lastFetchTime < 15 * 60 * 1000)) {
      console.log('📰 Returning news from memory cache...');
      return cachedNews;
    }

    console.log('📰 Fetching real-time news from GNews API...');
    const response = await axios.get(GNEWS_BASE_URL, {
      params: {
        q: 'india stock market OR sensex OR nifty OR BSE OR NSE',
        lang: 'en',
        max: 10,
        apikey: GNEWS_API_KEY
      },
      timeout: 10000
    });

    if (response.status !== 200 || !response.data.articles) {
      console.log('⚠️  No articles fetched from GNews API');
      return [];
    }

    const articles = response.data.articles;
    const formattedArticles = [];

    for (const article of articles) {
      const title = article.title || '';
      const desc = article.description || '';
      const text = `${title} ${desc}`;

      const sentiment = calculateSentiment(text);
      const publishedAt = new Date(article.publishedAt || Date.now());

      formattedArticles.push({
        _id: Math.random().toString(36).substr(2, 9), // UI needs a unique key usually
        headline: title,
        summary: desc,
        source_name: article.source?.name || 'Unknown',
        source_url: article.url,
        published_at: publishedAt.toISOString(),
        category: categorizeNews(text),
        sentiment_score: sentiment.score,
        sentiment_label: getSentimentLabel(sentiment.score),
        sentiment_confidence: sentiment.confidence,
        impact_level: getImpactLevel(sentiment.score),
        date_key: publishedAt.toISOString().split('T')[0],
      });
    }

    // Sort newest first
    formattedArticles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    cachedNews = formattedArticles;
    lastFetchTime = now;
    console.log(`📰 Fetched and cached ${formattedArticles.length} live articles.`);
    return cachedNews;
  } catch (error) {
    console.error('❌ Error fetching live news:', error.message);
    if (error.response) {
      console.error('   API Error Response:', error.response.status, error.response.data);
    }
    return cachedNews || []; // Fallback to stale cache if available
  }
};
