import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, X, Check, ArrowUp, ArrowDown, Radio, Target,
  Brain, BarChart3, Crosshair, Activity, Zap, Shield,
  Clock, BrainCircuit, TrendingUp, TrendingDown, Ban, ArrowRight
} from "lucide-react";
import { useTrades } from "@/contexts/TradeContext";
import { cn } from "@/lib/utils";

// ── Strategy metadata ──
const STRAT = {
  sniper: { icon: Crosshair, color: "text-purple-400", bg: "bg-purple-500/10" },
  balanced: { icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10" },
  aggressive: { icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
  conservative: { icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

export default function Signals() {
  const { trades, handleApprove, handleReject } = useTrades();
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Filter signals ──
  const signalTrades = useMemo(() => {
    return trades.filter(t => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && t.status === "PENDING_APPROVAL") ||
        (statusFilter === "approved" && t.status === "OPEN") ||
        (statusFilter === "rejected" && t.status === "REJECTED") ||
        (statusFilter === "closed" && ["WIN", "LOSS"].includes(t.status));

      const matchesStrategy =
        strategyFilter === "all" ||
        (t.strategy_name || "sniper").toLowerCase() === strategyFilter;

      const matchesSearch =
        !searchQuery ||
        (t.symbol || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.trade_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.setup_name || "").toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesStrategy && matchesSearch;
    });
  }, [trades, statusFilter, strategyFilter, searchQuery]);

  const pendingCount = trades.filter(t => t.status === "PENDING_APPROVAL").length;
  const hasActiveFilters = statusFilter !== "all" || strategyFilter !== "all" || searchQuery !== "";

  const clearFilters = () => {
    setStatusFilter("all");
    setStrategyFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] max-w-[1600px] mx-auto p-1 gap-4">

      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            Signal Feed
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono font-normal text-xs">
              {signalTrades.length} signals
            </Badge>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-mono text-xs animate-pulse">
                {pendingCount} pending
              </Badge>
            )}
          </h1>
          <p className="text-zinc-400 text-xs mt-1">Real-time signal intelligence from the 3-Layer evaluation engine.</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex-none flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
        <Tabs value={statusFilter} className="w-full xl:w-auto" onValueChange={setStatusFilter}>
          <TabsList className="bg-zinc-950 border border-zinc-800 h-8 p-0.5">
            <TabsTrigger value="all" className="text-[11px] px-3 data-[state=active]:bg-zinc-800 text-zinc-500">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-[11px] px-3 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 text-zinc-500">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-[11px] px-3 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-zinc-500">Approved</TabsTrigger>
            <TabsTrigger value="closed" className="text-[11px] px-3 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-zinc-500">Closed</TabsTrigger>
            <TabsTrigger value="rejected" className="text-[11px] px-3 data-[state=active]:bg-zinc-800 text-zinc-500">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto items-center">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-600" />
            <Input
              placeholder="Search signals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-zinc-950 border-zinc-800 text-xs h-8 focus-visible:ring-indigo-500/30"
            />
          </div>

          <Select value={strategyFilter} onValueChange={setStrategyFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-300">
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs">
              <SelectItem value="all">All Strategies</SelectItem>
              <SelectItem value="sniper">Sniper</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
              <SelectItem value="conservative">Conservative</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* ═══ Main Content: Signal List + Detail Panel ═══ */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

        {/* LEFT: Signal List */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Card className="h-full bg-zinc-950 border-zinc-800 shadow-lg overflow-hidden flex flex-col py-0">
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1.5">
                  {signalTrades.length === 0 ? (
                    <EmptySignals />
                  ) : (
                    signalTrades.map((trade, idx) => (
                      <SignalRow
                        key={trade._id || trade.trade_id}
                        trade={trade}
                        isSelected={selectedSignal?._id === trade._id}
                        onClick={() => setSelectedSignal(trade)}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        delay={idx * 40}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Detail Panel */}
        <div className="hidden xl:block xl:w-[380px] shrink-0">
          <Card className="h-full bg-zinc-950 border-zinc-800 shadow-lg overflow-hidden flex flex-col py-0">
            {selectedSignal ? (
              <SignalDetail trade={selectedSignal} onApprove={handleApprove} onReject={handleReject} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 p-6">
                <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/30">
                  <Radio className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-xs text-zinc-500 text-center">Click a signal row to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGNAL ROW
// ═══════════════════════════════════════════════════════════
function SignalRow({ trade, isSelected, onClick, onApprove, onReject, delay }) {
  const isBuy = (trade.action || "").toUpperCase() === "BUY";
  const isPending = trade.status === "PENDING_APPROVAL";
  const isOpen = trade.status === "OPEN";
  const isWin = trade.status === "WIN";
  const isLoss = trade.status === "LOSS";
  const isRejected = trade.status === "REJECTED";
  const total = Math.round(trade.confidence_score?.total || 0);
  const stratKey = (trade.strategy_name || "sniper").toLowerCase();
  const stratMeta = STRAT[stratKey] || STRAT.sniper;
  const StratIcon = stratMeta.icon;

  const statusColor =
    isPending ? "border-l-amber-500" :
    isOpen ? "border-l-blue-500" :
    isWin ? "border-l-emerald-500" :
    isLoss ? "border-l-red-500" :
    "border-l-zinc-700";

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-l-[3px] cursor-pointer transition-all duration-200 animate-fade-in-up",
        statusColor,
        isSelected
          ? "bg-zinc-800/60 border border-zinc-700/60"
          : "bg-zinc-900/30 border border-transparent hover:bg-zinc-900/60 hover:border-zinc-800/50"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Direction */}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
        isBuy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
      )}>
        {isBuy ? <ArrowUp size={16} strokeWidth={2.5} /> : <ArrowDown size={16} strokeWidth={2.5} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">{trade.symbol}</span>
          <span className={cn("text-[9px] font-bold uppercase tracking-wider", isBuy ? "text-emerald-400" : "text-red-400")}>
            {isBuy ? "BUY" : "SELL"}
          </span>
          <StratIcon size={10} className={stratMeta.color} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-mono">
          <span>₹{trade.entry?.price?.toLocaleString("en-IN")}</span>
          {trade.setup_name && (
            <span className="text-zinc-600 bg-zinc-900/50 px-1 rounded text-[9px]">{trade.setup_name}</span>
          )}
        </div>
      </div>

      {/* Status + Score */}
      <div className="flex items-center gap-2 shrink-0">
        {isPending && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onReject(trade._id); }}
              className="h-6 w-6 p-0 text-zinc-600 hover:text-red-400 hover:bg-red-500/10">
              <X size={12} />
            </Button>
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onApprove(trade._id); }}
              className="h-6 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded">
              <Check size={10} />
            </Button>
          </div>
        )}

        {/* Score badge */}
        <div className={cn(
          "text-xs font-bold font-mono tabular-nums px-1.5 py-0.5 rounded",
          total >= 75 ? "text-emerald-400 bg-emerald-500/10" :
          total >= 50 ? "text-amber-400 bg-amber-500/10" :
          "text-zinc-500 bg-zinc-800/50"
        )}>
          {total}
        </div>

        {/* P&L for closed trades */}
        {(isWin || isLoss) && (
          <span className={cn("text-xs font-bold font-mono", isWin ? "text-emerald-400" : "text-red-400")}>
            {trade.pnl > 0 ? "+" : ""}{trade.pnl?.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIGNAL DETAIL PANEL
// ═══════════════════════════════════════════════════════════
function SignalDetail({ trade, onApprove, onReject }) {
  const isBuy = (trade.action || "").toUpperCase() === "BUY";
  const isPending = trade.status === "PENDING_APPROVAL";
  const bd = trade.confidence_score?.breakdown || {};
  const total = Math.round(trade.confidence_score?.total || 0);
  const maxScore = trade.confidence_score?.max || 120;
  const stratKey = (trade.strategy_name || "sniper").toLowerCase();
  const stratMeta = STRAT[stratKey] || STRAT.sniper;
  const StratIcon = stratMeta.icon;

  const entry = trade.entry?.price || 0;
  const stopLoss = trade.entry?.stop_loss || 0;
  const target = trade.entry?.target || 0;

  const statusConfig = {
    PENDING_APPROVAL: { label: "Pending Approval", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock },
    OPEN: { label: "Open Position", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: TrendingUp },
    WIN: { label: "Winner", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: TrendingUp },
    LOSS: { label: "Loss", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: TrendingDown },
    REJECTED: { label: "Rejected", color: "text-zinc-500 bg-zinc-800/50 border-zinc-700", icon: Ban },
  };
  const st = statusConfig[trade.status] || statusConfig.REJECTED;
  const StatusIcon = st.icon;

  // Score layers
  const layers = [
    { label: "Technical", value: Number(bd.technical || 0).toFixed(1), max: 100, color: "bg-blue-500", icon: BarChart3 },
    { label: "Sentiment", value: Number(bd.sentiment || 0).toFixed(1), max: 20, color: "bg-amber-500", icon: Brain },
    { label: "ML Model", value: Number(bd.ml_model || 0).toFixed(1), max: 40, color: "bg-purple-500", icon: BrainCircuit },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 animate-slide-in-right">

        {/* Status + Direction Header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 uppercase font-bold flex items-center gap-1.5 border", st.color)}>
            <StatusIcon size={12} />
            {st.label}
          </Badge>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold",
            isBuy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            {isBuy ? <ArrowUp size={14} strokeWidth={2.5} /> : <ArrowDown size={14} strokeWidth={2.5} />}
            {isBuy ? "LONG" : "SHORT"}
          </div>
        </div>

        {/* Symbol + Strategy */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">{trade.symbol}</h2>
            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold", stratMeta.bg, stratMeta.color)}>
              <StratIcon size={10} />
              {stratKey.charAt(0).toUpperCase() + stratKey.slice(1)}
            </div>
          </div>
          {trade.setup_name && (
            <span className="text-[11px] text-zinc-500 mt-1 block font-mono">{trade.setup_name}</span>
          )}
          {trade.trade_id && (
            <span className="text-[10px] text-zinc-700 mt-0.5 block font-mono">{trade.trade_id}</span>
          )}
        </div>

        {/* ── Score Ring ── */}
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-2">Composite Score</div>
          <div className={cn(
            "text-4xl font-black font-mono tabular-nums",
            total >= 75 ? "text-emerald-400" : total >= 50 ? "text-amber-400" : "text-zinc-500"
          )}>
            {total}
          </div>
          <div className="text-[10px] text-zinc-600 font-mono">/ {maxScore}</div>

          {/* Score bar */}
          <div className="w-full h-2 bg-zinc-800/60 rounded-full mt-3 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                total >= 75 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
                total >= 50 ? "bg-gradient-to-r from-amber-600 to-amber-400" :
                "bg-zinc-600"
              )}
              style={{ width: `${Math.min((total / maxScore) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* ── 3-Layer Breakdown ── */}
        <div className="space-y-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">3-Layer Evaluation</div>
          {layers.map((layer) => {
            const LayerIcon = layer.icon;
            const pct = (Number(layer.value) / layer.max) * 100;
            return (
              <div key={layer.label} className="glass-card rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                    <LayerIcon size={12} className="text-zinc-500" />
                    {layer.label}
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-200">
                    {layer.value} <span className="text-zinc-600">/ {layer.max}</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", layer.color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Price Levels ── */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Price Levels</div>
          <div className="space-y-2">
            <PriceRow label="Entry" value={entry} color="text-zinc-100" />
            <PriceRow label="Stop Loss" value={stopLoss} color="text-red-400" />
            <PriceRow label="Target" value={target} color="text-emerald-400" />
            {trade.lots && <PriceRow label="Lot Size" value={trade.lots} color="text-indigo-400" prefix="" />}
          </div>

          {/* Risk/Reward visual */}
          {stopLoss > 0 && target > 0 && entry > 0 && (
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/50">
              <span className="text-[10px] text-zinc-500">Risk:Reward</span>
              <span className="text-xs font-bold font-mono text-indigo-400">
                1 : {Math.abs((target - entry) / (stopLoss - entry)).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* ── P&L (if closed) ── */}
        {(trade.status === "WIN" || trade.status === "LOSS") && (
          <div className={cn(
            "glass-card rounded-xl p-4 text-center",
            trade.pnl >= 0 ? "border-emerald-500/20" : "border-red-500/20"
          )}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Realized P&L</div>
            <div className={cn("text-2xl font-black font-mono", trade.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
              {trade.pnl >= 0 ? "+" : ""}₹{trade.pnl?.toLocaleString("en-IN")}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        {isPending && (
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => onReject(trade._id)}
              className="flex-1 h-9 border-zinc-700 text-zinc-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/30 text-xs font-bold">
              <X size={14} className="mr-1.5" /> Reject
            </Button>
            <Button onClick={() => onApprove(trade._id)}
              className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20">
              <Check size={14} className="mr-1.5" /> Approve Trade
            </Button>
          </div>
        )}

        {/* Timestamp */}
        {trade.entry?.time && (
          <div className="text-[10px] text-zinc-700 font-mono text-center pt-1">
            {new Date(trade.entry.time).toLocaleString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit", second: "2-digit"
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ── Helper Components ──
function PriceRow({ label, value, color, prefix = "₹" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className={cn("text-sm font-bold font-mono tabular-nums", color)}>
        {prefix}{typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </span>
    </div>
  );
}

function EmptySignals() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-5">
        <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/30">
          <Radio className="w-10 h-10 text-zinc-700" />
        </div>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
        </span>
      </div>
      <h3 className="text-base font-semibold text-zinc-300 mb-1">Waiting for signals...</h3>
      <p className="text-xs text-zinc-600 max-w-sm leading-relaxed">
        Signals appear here when the Python engine fires.
        Run the simulation or connect to live market to start receiving signals.
      </p>
      <div className="flex items-center gap-1.5 mt-4 text-[10px] text-zinc-600 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-pulse" />
        Listening on WebSocket
      </div>
    </div>
  );
}
