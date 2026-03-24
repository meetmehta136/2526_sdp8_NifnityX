import React, { useState, useEffect, useRef, useCallback } from "react";
import InfinityChart from "@/components/dashboard/InfinityChart";
import TradeFeed from "@/components/dashboard/TradeFeed";
import { TrendingUp, TrendingDown, Loader2, DollarSign, Percent, Wallet, Target, BarChart3, Radio, Cpu } from "lucide-react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrades } from "@/contexts/TradeContext";

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1D", value: "1d" },
];

// ── Animated Counter Hook ──
function useAnimatedValue(target, duration = 800) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = start + diff * eased;
      setValue(currentValue);
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = target;
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

// ── KPI Stat Card Component ──
function StatCard({ label, value, icon: Icon, color, prefix = "", suffix = "", delay = 0 }) {
  return (
    <div
      className="stat-card glass-card rounded-xl px-4 py-3 flex flex-col gap-1 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${color || "text-zinc-600"}`} />
      </div>
      <span className={`text-lg font-bold font-mono tabular-nums tracking-tight ${color || "text-zinc-100"}`}>
        {prefix}{value}{suffix}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [chartData, setChartData] = useState([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [activeInterval, setActiveInterval] = useState("1m");
  const [priceSummary, setPriceSummary] = useState(null);
  const [dashStats, setDashStats] = useState(null);
  const chartRef = useRef(null);
  const pollFailCount = useRef(0);

  const { trades, handleApprove, handleReject, handleExit } = useTrades();

  // ── Fetch Chart Data ──
  const loadChartData = useCallback(async (interval) => {
    setIsChartLoading(true);
    try {
      const { data } = await api.get(`/market/chart?symbol=NIFTY&interval=${interval}`);
      if (Array.isArray(data) && data.length > 0) {
        setChartData(data);
        pollFailCount.current = 0;
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error("Chart load failed:", error.message);
      setChartData([]);
    } finally {
      setIsChartLoading(false);
    }
  }, []);

  // ── Fetch Price Summary ──
  const loadPriceSummary = useCallback(async () => {
    try {
      const { data } = await api.get("/market/price?symbol=NIFTY");
      if (data) setPriceSummary(data);
    } catch (_) { }
  }, []);

  // ── Fetch Dashboard Stats ──
  const loadDashStats = useCallback(async () => {
    try {
      const { data } = await api.get("/trade/stats?mode=paper");
      if (data) setDashStats(data);
    } catch (_) { }
  }, []);

  // ── Initial Load ──
  useEffect(() => {
    loadChartData(activeInterval);
    loadPriceSummary();
    loadDashStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh stats when trades change
  useEffect(() => {
    loadDashStats();
  }, [trades.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Interval Change ──
  const handleIntervalChange = (interval) => {
    setActiveInterval(interval);
    loadChartData(interval);
  };

  // ── Live Polling (every 60s, market hours only) ──
  useEffect(() => {
    if (activeInterval !== "1m") return;

    const id = setInterval(async () => {
      if (pollFailCount.current >= 3) { clearInterval(id); return; }

      const now = new Date();
      const d = now.getDay(), h = now.getHours(), m = now.getMinutes();
      const isOpen = d >= 1 && d <= 5 && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30));
      if (!isOpen) return;

      try {
        const { data } = await api.get("/market/chart?symbol=NIFTY&interval=1m");
        if (Array.isArray(data) && data.length > 0) {
          const lastCandle = data[data.length - 1];
          chartRef.current?.updateCandle(lastCandle);
          pollFailCount.current = 0;
        }
      } catch (err) {
        pollFailCount.current++;
      }
      loadPriceSummary();
    }, 60000);

    // ── WebSocket Live Updates ──
    // ── WebSocket Live Updates ──
    const onStatsUpdate = () => {
      console.log("🔄 [Socket] Stats update received, refreshing KPIs...");
      loadDashStats();
    };
    import("@/lib/socket").then(({ socket }) => {
      socket.on("stats_update", onStatsUpdate);
    });

    return () => {
      clearInterval(id);
      import("@/lib/socket").then(({ socket }) => {
        socket.off("stats_update", onStatsUpdate);
      });
    };
  }, [activeInterval, loadPriceSummary, loadDashStats]);

  // ── Stat values ──
  const sessionPnl = dashStats?.sessionPnl || dashStats?.totalPnL || 0;
  const returnPct = dashStats?.returnPercent || 0;
  const capital = dashStats?.capital || 100000;
  const winRate = dashStats?.winRate || 0;
  const totalTrades = dashStats?.totalTrades || dashStats?.closedTrades || 0;
  const signalsFired = dashStats?.signalsFired || trades.filter(t => t.status !== "PENDING_APPROVAL").length || 0;
  const candlesProcessed = dashStats?.candlesProcessed || 0;

  // Animated values
  const animPnl = useAnimatedValue(sessionPnl);
  const animReturn = useAnimatedValue(returnPct);
  const animCapital = useAnimatedValue(capital);
  const animWinRate = useAnimatedValue(winRate);

  const isUp = priceSummary?.change >= 0;

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-[calc(100vh-theme(spacing.28))] xl:min-h-0">

      {/* ═══ HERO STATS BAR ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 stagger-children">
        <StatCard
          label="Session P&L"
          icon={DollarSign}
          value={`₹${animPnl >= 0 ? "+" : ""}${Math.round(animPnl).toLocaleString("en-IN")}`}
          color={sessionPnl >= 0 ? "text-emerald-400" : "text-red-400"}
          delay={0}
        />
        <StatCard
          label="Return %"
          icon={Percent}
          value={`${animReturn >= 0 ? "+" : ""}${animReturn.toFixed(2)}%`}
          color={returnPct >= 0 ? "text-emerald-400" : "text-red-400"}
          delay={60}
        />
        <StatCard
          label="Capital"
          icon={Wallet}
          value={`₹${Math.round(animCapital).toLocaleString("en-IN")}`}
          color="text-indigo-400"
          delay={120}
        />
        <StatCard
          label="Win Rate"
          icon={Target}
          value={`${animWinRate.toFixed(1)}%`}
          color="text-blue-400"
          delay={180}
        />
        <StatCard
          label="Total Trades"
          icon={BarChart3}
          value={totalTrades}
          color="text-zinc-200"
          delay={240}
        />
        <StatCard
          label="Signals Fired"
          icon={Radio}
          value={signalsFired}
          color="text-purple-400"
          delay={300}
        />
        <StatCard
          label="Candles"
          icon={Cpu}
          value={candlesProcessed > 0 ? candlesProcessed.toLocaleString("en-IN") : "—"}
          color="text-zinc-400"
          delay={360}
        />
      </div>

      {/* ═══ CHART + TRADE FEED ═══ */}
      <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">
        {/* CHART SECTION */}
        <section className="flex-1 min-h-[400px] xl:min-h-0 flex flex-col gap-2 relative">
          <div className="flex items-center justify-between px-0.5 shrink-0 h-8">
            <div className="flex items-center gap-2">
              {priceSummary ? (
                <>
                  <span className="text-base font-bold text-zinc-100 font-mono tabular-nums">
                    ₹{priceSummary.price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${isUp ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                    }`}>
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {isUp ? "+" : ""}{priceSummary.change?.toFixed(2)}
                    <span className="opacity-60 ml-0.5">({isUp ? "+" : ""}{priceSummary.changePercent?.toFixed(2)}%)</span>
                  </span>
                </>
              ) : (
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-24 bg-zinc-800" />
                  <Skeleton className="h-5 w-20 bg-zinc-800" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1">
              {INTERVALS.map((i) => (
                <button
                  key={i.value}
                  onClick={() => handleIntervalChange(i.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeInterval === i.value
                    ? "bg-indigo-500/15 text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            {isChartLoading ? <ChartLoader /> : <InfinityChart ref={chartRef} data={chartData} interval={activeInterval} />}
          </div>
        </section>

        {/* TRADE FEED */}
        <section className="xl:w-[420px] min-h-[400px] xl:min-h-0 xl:h-full overflow-hidden shrink-0">
          <TradeFeed
            trades={trades}
            onApprove={handleApprove}
            onReject={handleReject}
            onExit={handleExit}
            livePrice={priceSummary?.price || null}
          />
        </section>
      </div>
    </div>
  );
}

function ChartLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
    </div>
  );
}