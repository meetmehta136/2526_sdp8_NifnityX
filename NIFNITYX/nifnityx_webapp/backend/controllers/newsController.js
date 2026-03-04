import News from "../models/News.js";

export const getTodayNews = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const news = await News.find({ date_key: today }).sort({ published_at: -1 });

    // If no news found, create sample data for demo
    if (news.length === 0) {
      console.log('⚠️  No news in database, creating sample data...');
      const sampleNews = [
        {
          headline: "NIFTY 50 Surges to New All-Time High on Strong FII Inflows",
          summary: "The benchmark index gained 250 points as foreign institutional investors pumped in ₹5,000 crore into Indian equities.",
          source_name: "Economic Times",
          source_url: `https://example.com/news/${Date.now()}-1`,
          published_at: new Date(),
          category: "NIFTY50",
          sentiment_score: 0.75,
          sentiment_label: "bullish",
          sentiment_confidence: 0.85,
          impact_level: "high",
          date_key: today,
        },
        {
          headline: "RBI Keeps Repo Rate Unchanged at 6.5%, Maintains Accommodative Stance",
          summary: "The Reserve Bank of India decided to maintain status quo on interest rates citing inflation concerns.",
          source_name: "Business Standard",
          source_url: `https://example.com/news/${Date.now()}-2`,
          published_at: new Date(Date.now() - 3600000),
          category: "RBI",
          sentiment_score: 0.15,
          sentiment_label: "neutral",
          sentiment_confidence: 0.70,
          impact_level: "medium",
          date_key: today,
        },
        {
          headline: "Bank Nifty Falls 1.5% on Profit Booking After Recent Rally",
          summary: "Banking stocks witnessed selling pressure as traders booked profits following a strong upward move.",
          source_name: "Moneycontrol",
          source_url: `https://example.com/news/${Date.now()}-3`,
          published_at: new Date(Date.now() - 7200000),
          category: "BANKNIFTY",
          sentiment_score: -0.45,
          sentiment_label: "bearish",
          sentiment_confidence: 0.75,
          impact_level: "medium",
          date_key: today,
        },
        {
          headline: "Global Markets Rally on Positive US Economic Data",
          summary: "Asian markets followed Wall Street higher after strong jobs report boosted investor confidence.",
          source_name: "Reuters",
          source_url: `https://example.com/news/${Date.now()}-4`,
          published_at: new Date(Date.now() - 10800000),
          category: "GLOBAL",
          sentiment_score: 0.55,
          sentiment_label: "bullish",
          sentiment_confidence: 0.80,
          impact_level: "high",
          date_key: today,
        },
        {
          headline: "IT Stocks Under Pressure Amid Earnings Concerns",
          summary: "Technology stocks declined as investors worried about slower growth in the upcoming quarter.",
          source_name: "CNBC TV18",
          source_url: `https://example.com/news/${Date.now()}-5`,
          published_at: new Date(Date.now() - 14400000),
          category: "EARNINGS",
          sentiment_score: -0.30,
          sentiment_label: "bearish",
          sentiment_confidence: 0.65,
          impact_level: "low",
          date_key: today,
        },
      ];

      await News.insertMany(sampleNews);
      const insertedNews = await News.find({ date_key: today }).sort({ published_at: -1 });
      
      const summary = {
        total_count: insertedNews.length,
        bullish_count: insertedNews.filter((n) => n.sentiment_label === "bullish").length,
        neutral_count: insertedNews.filter((n) => n.sentiment_label === "neutral").length,
        bearish_count: insertedNews.filter((n) => n.sentiment_label === "bearish").length,
        overall_sentiment: insertedNews.reduce((sum, n) => sum + n.sentiment_score, 0) / insertedNews.length,
      };

      return res.json({ date: today, summary, articles: insertedNews });
    }

    const summary = {
      total_count: news.length,
      bullish_count: news.filter((n) => n.sentiment_label === "bullish").length,
      neutral_count: news.filter((n) => n.sentiment_label === "neutral").length,
      bearish_count: news.filter((n) => n.sentiment_label === "bearish").length,
      overall_sentiment: news.length > 0 ? news.reduce((sum, n) => sum + n.sentiment_score, 0) / news.length : 0,
    };

    res.json({ date: today, summary, articles: news });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch today's news", error: error.message });
  }
};

export const getNewsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date parameter required (YYYY-MM-DD)" });

    const news = await News.find({ date_key: date }).sort({ published_at: -1 });

    const summary = {
      total_count: news.length,
      bullish_count: news.filter((n) => n.sentiment_label === "bullish").length,
      neutral_count: news.filter((n) => n.sentiment_label === "neutral").length,
      bearish_count: news.filter((n) => n.sentiment_label === "bearish").length,
      overall_sentiment: news.length > 0 ? news.reduce((sum, n) => sum + n.sentiment_score, 0) / news.length : 0,
    };

    res.json({ date, summary, articles: news });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch news by date", error: error.message });
  }
};

export const getNewsSummary = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const news = await News.find({
      published_at: { $gte: startDate },
    }).sort({ published_at: -1 });

    const dailySummary = {};
    news.forEach((article) => {
      const dateKey = article.date_key;
      if (!dailySummary[dateKey]) {
        dailySummary[dateKey] = { scores: [], count: 0 };
      }
      dailySummary[dateKey].scores.push(article.sentiment_score);
      dailySummary[dateKey].count++;
    });

    const trendData = Object.keys(dailySummary).map((date) => ({
      date,
      avg_sentiment: dailySummary[date].scores.reduce((a, b) => a + b, 0) / dailySummary[date].count,
      article_count: dailySummary[date].count,
    }));

    res.json({ days, trend_data: trendData });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch news summary", error: error.message });
  }
};

export const storeNewsFromPython = async (req, res) => {
  try {
    const secret = req.headers["x-python-secret"];
    if (secret !== process.env.PYTHON_SECRET) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { articles } = req.body;
    if (!articles || !Array.isArray(articles)) {
      return res.status(400).json({ message: "Invalid articles array" });
    }

    let stored = 0;
    let skipped = 0;

    for (const article of articles) {
      const exists = await News.findOne({ source_url: article.source_url });
      if (exists) {
        skipped++;
        continue;
      }

      await News.create(article);
      stored++;
    }

    res.json({ status: "success", stored, skipped });
  } catch (error) {
    res.status(500).json({ message: "Failed to store news", error: error.message });
  }
};

export const refreshNews = async (req, res) => {
  try {
    const { fetchAndStoreNews } = await import("../utils/newsService.js");
    console.log('🔄 Manual news refresh triggered...');
    const result = await fetchAndStoreNews();
    res.json({ 
      status: "success", 
      message: "News refresh completed",
      stored: result.stored,
      skipped: result.skipped,
      error: result.error || null
    });
  } catch (error) {
    console.error('❌ Refresh error:', error);
    res.status(500).json({ message: "Failed to trigger refresh", error: error.message });
  }
};

export const testGNewsAPI = async (req, res) => {
  try {
    const axios = (await import("axios")).default;
    const GNEWS_API_KEY = "3933d620f8b6e0b563833061244d2aa2";
    const GNEWS_BASE_URL = "https://gnews.io/api/v4/search";
    
    const response = await axios.get(GNEWS_BASE_URL, {
      params: {
        q: 'india',
        lang: 'en',
        max: 3,
        apikey: GNEWS_API_KEY
      },
      timeout: 10000
    });
    
    res.json({
      status: "success",
      apiStatus: response.status,
      articlesCount: response.data?.articles?.length || 0,
      sample: response.data?.articles?.[0] || null
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      response: error.response?.data || null
    });
  }
};
