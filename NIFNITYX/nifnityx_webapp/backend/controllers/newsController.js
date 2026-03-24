import { fetchLiveNews } from "../utils/newsService.js";

export const getTodayNews = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const news = await fetchLiveNews();

    if (!news || news.length === 0) {
      return res.json({ date: today, summary: null, articles: [] });
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
    res.status(500).json({ message: "Failed to fetch top news", error: error.message });
  }
};

export const getNewsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date parameter required (YYYY-MM-DD)" });

    const news = await fetchLiveNews();

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
    const { fetchLiveNews } = await import("../utils/newsService.js");
    console.log('🔄 Manual news refresh triggered...');
    // Simply fetch without using cache
    const result = await fetchLiveNews();
    res.json({
      status: "success",
      message: "News refresh completed",
      fetched: result.length,
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
