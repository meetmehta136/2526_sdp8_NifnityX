import React, { useState, useEffect, useRef, useCallback } from "react";
import InfinityChart from "@/components/dashboard/InfinityChart";
import TradeFeed from "@/components/dashboard/TradeFeed";
import { toast } from "sonner";
import { Bell, CheckCircle2, XCircle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { socket } from "@/lib/socket";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1D", value: "1d" },
];

export default function Dashboard() {
  const [chartData, setChartData] = useState([]);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [activeInterval, setActiveInterval] = useState("1m");
  const [priceSummary, setPriceSummary] = useState(null);
  const chartRef = useRef(null);
  const [trades, setTrades] = useState([]);
  const pollFailCount = useRef(0);

  // ── Fetch Chart Data (Yahoo Finance — Free) ──
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

  // ── Initial Load ──
  useEffect(() => {
    loadChartData(activeInterval);
    loadPriceSummary();
    const fetchTrades = async () => {
      try {
        const res = await api.get("/trade?limit=20");
        if (res.data && Array.isArray(res.data)) setTrades(res.data);
      } catch (_) { }
    };
    fetchTrades();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    return () => clearInterval(id);
  }, [activeInterval, loadPriceSummary]);

  // ── Socket.io: New Signals ──
  useEffect(() => {
    const onSignal = (sig) => {
      setTrades((prev) => [sig, ...prev]);
      toast.custom(() => (
        <div className="flex w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg p-3 shadow-xl items-start gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-full border border-indigo-500/20 shrink-0">
            <Bell className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Signal: <span className="text-indigo-300">{sig.symbol}</span></p>
            <p className="text-[10px] text-zinc-500">{sig.setup_name}</p>
          </div>
        </div>
      ), { duration: 4000 });
    };

    const onTradeUpdate = (updatedTrade) => {
      setTrades((prev) =>
        prev.map((t) =>
          (t._id === updatedTrade._id || t.trade_id === updatedTrade.trade_id)
            ? updatedTrade
            : t
        )
      );
    };

    socket.on("new_signal", onSignal);
    socket.on("trade_update", onTradeUpdate);

    return () => {
      socket.off("new_signal", onSignal);
      socket.off("trade_update", onTradeUpdate);
    };
  }, []);

  // ── Trade Handlers ──
  const handleApprove = async (tradeId, isForce = false) => {
    // Optimistic update
    setTrades((p) => p.map((t) => (t._id === tradeId ? { ...t, status: "OPEN" } : t)));
    try {
      await api.post(`/trade/${tradeId}/approve`, { force: isForce });
      toast.success(isForce ? "Trade Force-Approved" : "Trade Approved", {
        icon: <CheckCircle2 className="text-emerald-500" />,
      });
    } catch (err) {
      // Rollback on failure
      setTrades((p) => p.map((t) => (t._id === tradeId && t.status === "OPEN" ? { ...t, status: "PENDING_APPROVAL" } : t)));
      const msg = err.response?.data?.message || "Approval Failed";
      toast.error(msg);
    }
  };

  const handleReject = async (tradeId) => {
    setTrades((p) => p.map((t) => (t._id === tradeId ? { ...t, status: "REJECTED" } : t)));
    try {
      await api.post(`/trade/${tradeId}/reject`, { reason: "User rejected" });
      toast.info("Trade Rejected", { icon: <XCircle className="text-red-500" /> });
    } catch (_) { }
  };

  const handleExit = async (tradeId) => {
    try {
      await api.post(`/trade/${tradeId}/exit`);
      toast.success("Sell command sent", { icon: <CheckCircle2 className="text-amber-500" /> });
    } catch (err) {
      toast.error(err.response?.data?.message || "Exit failed");
    }
  };

  // ── RENDER ──
  const isUp = priceSummary?.change >= 0;

  return (
    <div className="flex flex-col xl:flex-row gap-4 w-full h-full min-h-[calc(100vh-theme(spacing.28))] xl:min-h-0">
      {/* CHART SECTION — fills available height */}
      <section className="flex-1 min-h-[400px] xl:min-h-0 flex flex-col gap-2 relative">
        {/* Compact toolbar: Price + Intervals */}
        <div className="flex items-center justify-between px-0.5 shrink-0 h-8">
          {/* Price (compact — since navbar also shows it) */}
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

          {/* Interval buttons */}
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

        {/* Chart — fills remaining space */}
        <div className="flex-1 w-full min-h-0 relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          {isChartLoading ? <ChartLoader /> : <InfinityChart ref={chartRef} data={chartData} interval={activeInterval} />}
        </div>
      </section>

      {/* TRADE FEED — fills height on large screens, fixed/min-height on mobile/tablet */}
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
  );
}

// ── Minimal Chart Loader ──
function ChartLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
    </div>
  );
}