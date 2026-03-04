import { useState, useEffect, useMemo } from "react";
import { fetchTodayNews, fetchNewsByDate, fetchNewsSummary } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Clock, ExternalLink, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [summary, setSummary] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const categories = ["All", "NIFTY50", "BANKNIFTY", "FII_DII", "RBI", "GLOBAL", "EARNINGS", "GEOPOLITICAL"];

  const fetchNews = async (date) => {
    setLoading(true);
    try {
      const { data } = date === new Date().toISOString().split("T")[0]
        ? await fetchTodayNews()
        : await fetchNewsByDate(date);
      setNews(data.articles || []);
      setSummary(data.summary || null);
      setLastUpdated(new Date());
    } catch (error) {
      toast.error("Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const isMarketOpen = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const time = hours * 60 + minutes;
      const marketStart = 9 * 60 + 15;
      const marketEnd = 15 * 60 + 30;
      return time >= marketStart && time <= marketEnd;
    };

    if (!isMarketOpen()) return;

    const interval = setInterval(() => {
      fetchNews(selectedDate);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  const filteredNews = useMemo(() => {
    return news.filter((article) => {
      const matchesCategory = categoryFilter === "All" || article.category === categoryFilter;
      const matchesSentiment = sentimentFilter === "All" || article.sentiment_label === sentimentFilter.toLowerCase();
      const matchesSearch = article.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           article.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSentiment && matchesSearch;
    });
  }, [news, categoryFilter, sentimentFilter, searchQuery]);

  const getSentimentIcon = (label) => {
    if (label === "bullish") return <TrendingUp className="w-4 h-4" />;
    if (label === "bearish") return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getSentimentColor = (label) => {
    if (label === "bullish") return "bg-green-500/20 text-green-400 border-green-500/50";
    if (label === "bearish") return "bg-red-500/20 text-red-400 border-red-500/50";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
  };

  const getImpactBadge = (level) => {
    if (level === "high") return <Badge className="bg-orange-500/20 text-orange-400">🔥 HIGH IMPACT</Badge>;
    if (level === "medium") return <Badge className="bg-blue-500/20 text-blue-400">⚡ MEDIUM</Badge>;
    return <Badge className="bg-zinc-700 text-zinc-400">📌 LOW</Badge>;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Market News & Sentiment</h1>
          <p className="text-sm text-zinc-400 mt-1">
            <Clock className="w-3 h-3 inline mr-1" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={() => fetchNews(selectedDate)} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {summary && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Daily Sentiment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{summary.total_count}</div>
                <div className="text-xs text-zinc-400">Total Articles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{summary.bullish_count}</div>
                <div className="text-xs text-zinc-400">🟢 Bullish</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{summary.neutral_count}</div>
                <div className="text-xs text-zinc-400">🟡 Neutral</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{summary.bearish_count}</div>
                <div className="text-xs text-zinc-400">🔴 Bearish</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-zinc-400">Overall Sentiment</div>
              <div className={`text-3xl font-bold ${summary.overall_sentiment > 0 ? 'text-green-400' : summary.overall_sentiment < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                {summary.overall_sentiment > 0 ? '📈' : summary.overall_sentiment < 0 ? '📉' : '➡️'} {summary.overall_sentiment.toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 items-center bg-zinc-900 p-4 rounded-lg border border-zinc-800 sticky top-0 z-10">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-40 bg-zinc-800 border-zinc-700"
        />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search headlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Badge
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`cursor-pointer ${categoryFilter === cat ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            >
              {cat}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          {["All", "Bullish", "Neutral", "Bearish"].map((sent) => (
            <Badge
              key={sent}
              onClick={() => setSentimentFilter(sent)}
              className={`cursor-pointer ${sentimentFilter === sent ? 'bg-purple-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            >
              {sent}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-3 bg-zinc-800" />
                <Skeleton className="h-4 w-full mb-2 bg-zinc-800" />
                <Skeleton className="h-4 w-2/3 bg-zinc-800" />
              </CardContent>
            </Card>
          ))
        ) : filteredNews.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center text-zinc-500">
              No news articles found for the selected filters.
            </CardContent>
          </Card>
        ) : (
          filteredNews.map((article, idx) => (
            <Card key={idx} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getSentimentColor(article.sentiment_label)}>
                        {getSentimentIcon(article.sentiment_label)}
                        <span className="ml-1 uppercase">{article.sentiment_label}</span>
                      </Badge>
                      <Badge variant="outline" className="text-xs">{article.category}</Badge>
                      {getImpactBadge(article.impact_level)}
                    </div>
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-white hover:text-blue-400 transition-colors flex items-center gap-2 group"
                    >
                      {article.headline}
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{article.summary}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                      <span>{article.source_name}</span>
                      <span>•</span>
                      <span>{formatTime(article.published_at)}</span>
                      <span>•</span>
                      <span>Score: {article.sentiment_score.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{
                      color: article.sentiment_score > 0 ? '#4ade80' : article.sentiment_score < 0 ? '#f87171' : '#fbbf24'
                    }}>
                      {article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score.toFixed(2)}
                    </div>
                    <div className="w-24 h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${article.sentiment_confidence * 100}%`,
                          backgroundColor: article.sentiment_score > 0 ? '#4ade80' : article.sentiment_score < 0 ? '#f87171' : '#fbbf24'
                        }}
                      />
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {(article.sentiment_confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default News;
