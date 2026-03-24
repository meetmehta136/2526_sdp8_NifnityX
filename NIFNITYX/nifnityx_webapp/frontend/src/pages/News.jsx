import React, { useState, useEffect, useMemo } from "react";
import { fetchTodayNews, fetchNewsByDate, fetchNewsSummary } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Clock, ExternalLink, Search, RefreshCw, Flame, Zap, Info, X } from "lucide-react";
import { toast } from "sonner";

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [summary, setSummary] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const categories = ["NIFTY50", "BANKNIFTY", "FII_DII", "RBI", "GLOBAL", "EARNINGS", "GEOPOLITICAL"];
  const sentiments = ["Bullish", "Neutral", "Bearish"];

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
      const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
      const matchesSentiment = sentimentFilter === "all" || article.sentiment_label === sentimentFilter.toLowerCase();
      const matchesSearch = article.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSentiment && matchesSearch;
    });
  }, [news, categoryFilter, sentimentFilter, searchQuery]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setSentimentFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = categoryFilter !== 'all' || sentimentFilter !== 'all' || searchQuery !== '';

  const getSentimentIcon = (label) => {
    if (label === "bullish") return <TrendingUp size={12} />;
    if (label === "bearish") return <TrendingDown size={12} />;
    return <Minus size={12} />;
  };

  const getSentimentColor = (label) => {
    if (label === "bullish") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (label === "bearish") return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  };

  const getImpactBadge = (level) => {
    if (level === "high") return <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] px-1.5"><Flame size={12} className="mr-1" /> HIGH IMPACT</Badge>;
    if (level === "medium") return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] px-1.5"><Zap size={12} className="mr-1" /> MEDIUM</Badge>;
    return <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5"><Info size={12} className="mr-1" /> LOW</Badge>;
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
    <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] max-w-[1600px] mx-auto p-1 gap-4">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            Market News
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono font-normal text-xs">
              {filteredNews.length} Articles
            </Badge>
          </h1>
          <p className="text-zinc-400 text-xs mt-1 flex items-center">
            <Clock className="w-3 h-3 inline mr-1" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchNews(selectedDate)} className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 h-8 text-xs">
          <RefreshCw className="w-3 h-3 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex-none flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
        <Tabs value={sentimentFilter} className="w-full xl:w-auto" onValueChange={setSentimentFilter}>
          <TabsList className="bg-zinc-950 border border-zinc-800 h-8 p-0.5">
            <TabsTrigger value="all" className="text-[11px] px-3 data-[state=active]:bg-zinc-800 text-zinc-500">All Sentiment</TabsTrigger>
            <TabsTrigger value="bullish" className="text-[11px] px-3 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-zinc-500">Bullish</TabsTrigger>
            <TabsTrigger value="neutral" className="text-[11px] px-3 data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-400 text-zinc-500">Neutral</TabsTrigger>
            <TabsTrigger value="bearish" className="text-[11px] px-3 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400 text-zinc-500">Bearish</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto items-center">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-xs h-8 text-zinc-300 w-full sm:w-[140px]"
          />

          <div className="relative flex-1 sm:w-56 w-full">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-600" />
            <Input
              placeholder="Search headlines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-zinc-950 border-zinc-800 text-xs h-8 focus-visible:ring-indigo-500/30"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-300">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-auto pr-2 pb-10 space-y-3 relative">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="bg-zinc-900/50 border-zinc-800/40">
              <CardContent className="p-4 flex flex-col gap-2">
                <Skeleton className="h-6 w-3/4 bg-zinc-800" />
                <Skeleton className="h-4 w-full bg-zinc-800" />
                <Skeleton className="h-4 w-2/3 bg-zinc-800" />
              </CardContent>
            </Card>
          ))
        ) : filteredNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-zinc-500">
            <Search size={48} className="text-zinc-700 mb-4 opacity-50" />
            <p>No news articles found for the selected filters.</p>
          </div>
        ) : (
          filteredNews.map((article, idx) => (
            <Card key={idx} className="p-2  bg-zinc-950/60 border-zinc-800/50 hover:bg-zinc-900/80 hover:border-zinc-700/80 transition-all group rounded-xl shadow-sm">
              <CardContent className="px-3 py-3 sm:px-4 sm:py-3.5 flex flex-col md:flex-row items-start justify-between gap-4 md:gap-4">
                <div className="flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5 flex-row">
                    <Badge variant="outline" className={`${getSentimentColor(article.sentiment_label)} text-[9px] px-1.5 py-0 uppercase font-bold flex items-center gap-1 leading-none h-4`}>
                      {getSentimentIcon(article.sentiment_label)}
                      {article.sentiment_label}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] bg-zinc-900 text-zinc-300 border-zinc-800 py-0 leading-none h-4">
                      {article.category}
                    </Badge>
                    {getImpactBadge(article.impact_level)}
                    <span className="text-zinc-500 text-[10px] hidden sm:block ml-auto mt-0.5">
                      {formatTime(article.published_at)}
                    </span>
                  </div>
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] sm:text-base font-semibold text-zinc-100 hover:text-indigo-400 transition-colors flex items-start group-hover:underline leading-snug"
                  >
                    {article.headline}
                  </a>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{article.summary}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-zinc-500">
                    <span className="text-zinc-400 font-medium">{article.source_name}</span>
                    <span className="sm:hidden">• {formatTime(article.published_at)}</span>
                  </div>
                </div>

                {/* Score Indicator Side */}
                <div className="hidden md:flex flex-col items-end shrink-0 min-w-[100px] mt-0.5 border-l border-zinc-800/50 pl-4">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-0.5">Score</span>
                  <div className="text-xl font-bold font-mono tracking-tighter leading-none" style={{
                    color: article.sentiment_score > 0 ? '#4ade80' : article.sentiment_score < 0 ? '#f87171' : '#fbbf24'
                  }}>
                    {article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score.toFixed(2)}
                  </div>
                  <div className="w-20 h-1.5 bg-zinc-800/60 rounded-full mt-2.5 overflow-hidden flex justify-start" style={{ direction: article.sentiment_score < 0 ? 'rtl' : 'ltr' }}>
                    <div
                      className="h-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.abs(article.sentiment_score) * 100}%`,
                        backgroundColor: article.sentiment_score > 0 ? '#4ade80' : article.sentiment_score < 0 ? '#f87171' : '#fbbf24'
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-tight">
                    {(article.sentiment_confidence * 100).toFixed(0)}% Conf
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
