import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check, X, TrendingUp, TrendingDown,
  Ban, BrainCircuit, Activity,
  LogOut, ArrowRight, ArrowDown, ArrowUp,
  Crosshair, Zap, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Strategy icon map ──
const STRAT = {
  sniper: { icon: Crosshair, color: "text-purple-400" },
  balanced: { icon: Activity, color: "text-blue-400" },
  aggressive: { icon: Zap, color: "text-amber-400" },
  conservative: { icon: Shield, color: "text-emerald-400" },
};

// ═══════════════════════════════════════════════════════════
// SIGNAL CARD — PENDING_APPROVAL (Minimal, flat design)
// ═══════════════════════════════════════════════════════════
const SignalCard = ({ trade, onApprove, onReject }) => {
  const bd = trade.confidence_score?.breakdown || {};
  const total = Math.round(trade.confidence_score?.total || 0);
  const entry = trade.entry?.price || 0;
  const stopLoss = trade.entry?.stop_loss;
  const isBuy = (trade.action || "").toUpperCase() === "BUY";

  // Strategy
  const stratKey = (trade.strategy_name || "sniper").toLowerCase();
  const stratMeta = STRAT[stratKey] || STRAT.sniper;
  const StratIcon = stratMeta.icon;

  // Score color
  const scoreColor = total >= 75 ? "text-emerald-400" : total >= 50 ? "text-amber-400" : "text-zinc-500";

  return (
    <div className="mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors">

        {/* Row 1: Direction + Symbol + Strategy + Score */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Direction indicator */}
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded",
              isBuy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            )}>
              {isBuy ? <ArrowUp size={14} strokeWidth={2.5} /> : <ArrowDown size={14} strokeWidth={2.5} />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-zinc-100">{trade.symbol}</span>
                <span className={cn("text-[9px] font-bold uppercase tracking-wider", isBuy ? "text-emerald-400" : "text-red-400")}>
                  {isBuy ? "BUY" : "SELL"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StratIcon size={9} className={stratMeta.color} />
                <span className="text-[9px] text-zinc-600 font-medium uppercase tracking-wide">{stratKey}</span>
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="text-right">
            <span className={cn("text-lg font-bold font-mono tabular-nums", scoreColor)}>{total}</span>
            <span className="text-[9px] text-zinc-700 font-medium block -mt-0.5">/120</span>
          </div>
        </div>

        {/* Row 2: Entry · SL · Lots + Breakdown */}
        <div className="px-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500">
            <span>Entry <span className="text-zinc-200 font-medium">₹{typeof entry === 'number' ? entry.toLocaleString('en-IN') : entry}</span></span>
            <span>SL <span className="text-red-400/80 font-medium">{stopLoss ? `₹${Number(stopLoss).toLocaleString('en-IN')}` : '—'}</span></span>
            <span><span className="text-zinc-200 font-medium">{trade.lots || 1}</span> Lots</span>
          </div>

          {/* 3-Layer breakdown — subtle text, not chips */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
            <span>T:<span className="text-zinc-400">{Number(bd.technical || 0).toFixed(0)}</span></span>
            <span>S:<span className="text-zinc-400">{Number(bd.sentiment || 0).toFixed(0)}</span></span>
            <span>ML:<span className="text-zinc-400">{Number(bd.ml_model || 0).toFixed(0)}</span></span>
          </div>
        </div>

        {/* Row 3: Actions */}
        <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 border-t border-zinc-800/50">
          <Button size="sm" variant="ghost" onClick={() => onReject(trade._id)}
            className="h-6 px-2.5 text-[10px] text-zinc-600 hover:text-red-400 hover:bg-red-500/10 font-medium gap-1">
            <X size={12} /> Reject
          </Button>
          <Button size="sm" onClick={() => onApprove(trade._id)}
            className="h-6 px-3 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide gap-1 rounded">
            <Check size={11} strokeWidth={3} /> Approve
          </Button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// HISTORY CARD — OPEN / WIN / LOSS / REJECTED
// ═══════════════════════════════════════════════════════════
const HistoryCard = ({ trade, onExit }) => {
  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const isOpen = trade.status === 'OPEN';
  const isExiting = trade.status === 'EXITING';
  const isRejected = trade.status === 'REJECTED';

  const border =
    isExiting ? "border-amber-700/60 transition-colors animate-pulse" :
      isOpen ? "border-zinc-700/60 hover:border-zinc-600" :
        isWin ? "border-zinc-800/50" :
          isLoss ? "border-zinc-800/50" :
            "border-zinc-800/30 opacity-50";

  const isAutoExecuted = trade.logs?.[0]?.message?.includes("Auto-Executed");

  return (
    <div className={cn("group flex items-center gap-3 p-2.5 mb-1 rounded-lg border transition-all", border)}>
      <div className={cn("p-1.5 rounded shrink-0",
        isWin ? "bg-emerald-950/50 text-emerald-500" :
          isLoss ? "bg-red-950/50 text-red-500" :
            isExiting ? "bg-amber-950/50 text-amber-500" :
              isOpen ? "bg-indigo-950/50 text-indigo-400" :
                "bg-zinc-900 text-zinc-600"
      )}>
        {isWin ? <TrendingUp size={12} /> :
          isLoss ? <TrendingDown size={12} /> :
            isRejected ? <Ban size={12} /> :
              <Activity size={12} className={isExiting ? "animate-spin" : ""} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-semibold text-xs", isRejected ? "text-zinc-500 line-through" : "text-zinc-200")}>{trade.symbol}</span>
          {trade.action && (
            <span className={cn("text-[8px] font-bold uppercase tracking-wider",
              trade.action === "BUY" ? "text-emerald-500/60" : "text-red-500/60"
            )}>{trade.action}</span>
          )}
          {isOpen && (
            <span className="text-[8px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 animate-pulse uppercase tracking-wider">Open</span>
          )}
          {isExiting && (
            <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse uppercase tracking-wider">Exiting</span>
          )}
          {isAutoExecuted && (
            <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">Auto</span>
          )}
        </div>
        {!isRejected && (
          <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
            {trade.entry?.price} <ArrowRight size={7} className="opacity-40" /> {trade.exit?.price || '...'}
          </span>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {isOpen && onExit && (
          <Button size="sm" variant="outline" onClick={() => onExit(trade._id)} disabled={isExiting}
            className="h-5 px-2 text-[9px] gap-1 rounded border-zinc-700 text-zinc-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 font-bold tracking-wide disabled:opacity-50">
            <LogOut size={8} /> {isExiting ? "Closing..." : "Exit Position"}
          </Button>
        )}
        {!isRejected ? (
          <div className="text-right">
            <div className={cn("text-xs font-bold font-mono",
              trade.pnl > 0 ? "text-emerald-400" : trade.pnl < 0 ? "text-red-400" : "text-zinc-500"
            )}>
              {trade.pnl > 0 ? '+' : ''}{trade.pnl || 0}
            </div>
            <div className="text-[8px] text-zinc-600 font-medium uppercase tracking-wider">
              {isOpen ? "unrealized" : "PNL"}
            </div>
          </div>
        ) : (
          <span className="text-[9px] font-bold text-zinc-700 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">Rejected</span>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// TRADE FEED — Main Container
// ═══════════════════════════════════════════════════════════
export default function TradeFeed({ trades, onApprove, onReject, onExit, livePrice }) {
  const bottomRef = React.useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trades]);

  const displayTrades = [...trades].reverse();

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="h-10 shrink-0 bg-zinc-950/80 border-b border-zinc-800 flex items-center px-3 gap-2">
        <BrainCircuit size={13} className="text-indigo-500" />
        <h3 className="font-semibold text-[11px] text-zinc-300 tracking-wide uppercase">Command Stream</h3>
        <span className="ml-auto text-[10px] font-mono text-zinc-600">{trades.length}</span>
      </div>

      {/* Feed */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
          <div className="p-2.5 flex flex-col justify-end min-h-full">
            {displayTrades.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 opacity-50 space-y-2 pb-10">
                <Activity size={20} />
                <p className="text-xs font-medium">System Idle</p>
              </div>
            )}

            {displayTrades.map(trade => (
              trade.status === 'PENDING_APPROVAL'
                ? <SignalCard key={trade._id || trade.trade_id} trade={trade} onApprove={onApprove} onReject={onReject} />
                : <HistoryCard key={trade._id || trade.trade_id} trade={trade} onExit={onExit} />
            ))}
            <div ref={bottomRef} className="h-0.5" />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}