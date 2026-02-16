import React, { useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check, X, TrendingUp, TrendingDown,
  Ban, BrainCircuit, Activity,
  AlertTriangle, LogOut, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Confidence Ring ──
const ScoreRing = ({ score, size = 40, stroke = 3 }) => {
  const r = (size - stroke) / 2;
  const circ = r * 2 * Math.PI;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color = score > 75 ? "text-emerald-500" : score > 50 ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle className="text-zinc-800/60" strokeWidth={stroke} stroke="currentColor" fill="transparent" r={r} cx={size / 2} cy={size / 2} />
        <circle className={`${color} transition-all duration-500`} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={r} cx={size / 2} cy={size / 2} />
      </svg>
      <span className={`absolute text-[11px] font-bold ${color}`}>{score}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// SIGNAL CARD — PENDING_APPROVAL
// ═══════════════════════════════════════════════════════════
const SignalCard = ({ trade, onApprove, onReject, livePrice }) => {
  const bd = trade.confidence_score?.breakdown || {};
  const total = trade.confidence_score?.total || 0;
  const entry = trade.entry?.price || 0;
  const maxSlip = trade.constraints?.slippage_per || 0.5;
  const slip = livePrice && entry ? (Math.abs(livePrice - entry) / entry) * 100 : 0;
  const isHigh = slip > maxSlip;

  return (
    <div className="mb-2.5 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className={cn(
        "bg-zinc-950 border rounded-lg overflow-hidden transition-colors",
        isHigh ? "border-red-500/40" : "border-zinc-800 hover:border-zinc-700"
      )}>
        {/* Main Content */}
        <div className="p-3 flex gap-3">
          {/* Score Ring */}
          <div className="shrink-0 pt-0.5">
            <ScoreRing score={total} />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Symbol + Setup */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-100 truncate">{trade.symbol}</h3>
              <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded shrink-0">{trade.setup_name}</span>
            </div>

            {/* Price Info — readable sizes */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-zinc-400">
                Entry <span className="text-zinc-100 font-semibold">₹{entry}</span>
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-400">
                SL <span className="text-red-400">{trade.entry?.stop_loss || '—'}</span>
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-400">
                <span className="text-zinc-200">{trade.lots}x</span> Lots
              </span>
            </div>

            {/* Breakdown — compact inline chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/15 text-blue-400 text-[10px] font-medium">
                Tech {bd.technical || 0}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/15 text-pink-400 text-[10px] font-medium">
                Sent {bd.sentiment || 0}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/15 text-purple-400 text-[10px] font-medium">
                ML {bd.ml_model || 0}
              </span>
              {/* Slippage chip */}
              {livePrice > 0 && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border",
                  isHigh ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/8 border-emerald-500/15 text-emerald-400"
                )}>
                  Slip {slip.toFixed(2)}% {isHigh && <AlertTriangle size={9} />}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/40 border-t border-zinc-800/50">
          <span className={cn("text-[10px] font-medium", isHigh ? "text-red-400" : "text-zinc-600")}>
            {isHigh ? "⚠ Slippage high — use FORCE" : "Ready to execute"}
          </span>
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="ghost" onClick={() => onReject(trade._id)}
              className="h-6 w-6 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10">
              <X size={13} />
            </Button>
            <Button size="sm" onClick={() => onApprove(trade._id, isHigh)}
              className={cn("h-6 px-3 text-[10px] gap-1 rounded font-bold tracking-wide",
                isHigh
                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              )}>
              <Check size={11} strokeWidth={3} />
              {isHigh ? "FORCE" : "APPROVE"}
            </Button>
          </div>
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
  const isRejected = trade.status === 'REJECTED';

  const border =
    isOpen ? "border-emerald-500/20 hover:border-emerald-500/30" :
      isWin ? "border-emerald-500/15" :
        isLoss ? "border-red-500/15" :
          "border-zinc-800/50 opacity-60";

  const iconStyle =
    isWin ? "bg-emerald-950 text-emerald-500 border-emerald-900" :
      isLoss ? "bg-red-950 text-red-500 border-red-900" :
        isOpen ? "bg-emerald-950 text-emerald-400 border-emerald-900" :
          "bg-zinc-900 text-zinc-500 border-zinc-800";

  return (
    <div className={cn("group flex items-center gap-3 p-2.5 mb-1 rounded-lg border transition-all", border)}>
      <div className={cn("p-1.5 rounded border shrink-0", iconStyle)}>
        {isWin ? <TrendingUp size={12} /> :
          isLoss ? <TrendingDown size={12} /> :
            isRejected ? <Ban size={12} /> :
              <Activity size={12} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-semibold text-xs", isRejected ? "text-zinc-500 line-through" : "text-zinc-200")}>{trade.symbol}</span>
          {isOpen && (
            <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 animate-pulse uppercase tracking-wider">Live</span>
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
          <Button size="sm" variant="outline" onClick={() => onExit(trade._id)}
            className="h-5 px-2 text-[9px] gap-1 rounded border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold tracking-wide">
            <LogOut size={8} /> SELL
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
              {isOpen ? "UNREALIZED" : "PNL"}
            </div>
          </div>
        ) : (
          <span className="text-[9px] font-bold text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">REJECTED</span>
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
                ? <SignalCard key={trade._id || trade.trade_id} trade={trade} onApprove={onApprove} onReject={onReject} livePrice={livePrice} />
                : <HistoryCard key={trade._id || trade.trade_id} trade={trade} onExit={onExit} />
            ))}
            <div ref={bottomRef} className="h-0.5" />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}