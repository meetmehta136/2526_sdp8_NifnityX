import React, { useEffect, useRef, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check, X, TrendingUp, TrendingDown,
  Ban, BellRing, ArrowRight, BrainCircuit, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- SUB-COMPONENT: Circular Progress ---
const CircularScore = ({ score, size = 48, strokeWidth = 4 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Ensure score is within 0-100 for visual representation logic if strictly percentage, 
  // but if max is 160, this component should ideally accept 'max' or assume score is normalized.
  // For now, assuming score is passed as raw number, we might want to normalize it if it exceeds 100 visual cap.
  // Let's assume input 'score' here is meant to be % for the circle. 
  // If we receive 160, the circle logic below might behave oddly if not clamped.
  // However, usually the parent passes normalized score or we clamp it.
  const normalizedScore = Math.min(score, 100); 
  const offset = circumference - (normalizedScore / 100) * circumference;
  
  const color = normalizedScore > 75 ? "text-emerald-500" : normalizedScore > 50 ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-zinc-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${color} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className={`absolute text-[10px] font-bold ${color}`}>{score}</span>
    </div>
  );
};

// --- SUB-COMPONENT: Stat Bar ---
const StatBar = ({ label, value, max = 100, colorClass = "bg-indigo-500" }) => (
  <div className="flex flex-col gap-0.5 w-full">
    <div className="flex justify-between text-[9px] text-zinc-500 uppercase tracking-wider">
      <span>{label}</span>
      <span className="text-zinc-300">{value}</span>
    </div>
    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${Math.min((Math.abs(value) / max) * 100, 100)}%` }}
      />
    </div>
  </div>
);

// --- COMPONENT: Active Signal Card (Data HUD) ---
const SignalCard = ({ trade, onApprove, onReject }) => {
  const [timeLeft, setTimeLeft] = useState(100);

  // Timeline Simulation (30s Expiry)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onReject(trade.trade_id, "EXPIRED");
          return 0;
        }
        return prev - (100 / 300); // ~30s
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Extract Data safely
  const breakdown = trade.confidence_score?.breakdown || { technical: 0, sentiment: 0, ml_model: 0 };
  const totalScore = trade.confidence_score?.total || 0;

  return (
    <div className="mb-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
      {/* Header Notification Badge */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <div className="p-1 rounded bg-indigo-500/10 border border-indigo-500/20">
          <BellRing size={10} className="text-indigo-400" />
        </div>
        <span className="text-[10px] font-medium text-indigo-300 tracking-wide uppercase">Signal Detected</span>
      </div>

      <div className="relative bg-zinc-950/80 border border-zinc-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm group hover:border-zinc-700 transition-colors">
        {/* Main Content Grid */}
        <div className="flex p-3 gap-4">
          {/* Left: Confidence Score */}
          <div className="flex flex-col items-center justify-center gap-1 min-w-[50px]">
            <CircularScore score={totalScore} />
            <span className="text-[9px] text-zinc-500 font-medium">CONFIDENCE</span>
          </div>

          {/* Middle: Data Details */}
          <div className="flex-1 flex flex-col gap-2">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-tight">{trade.symbol}</h3>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-400 font-mono">
                  {trade.setup_name}
                </Badge>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                Entry: <span className="text-zinc-200">@{trade.entry?.price}</span> • Lots: <span className="text-zinc-200">{trade.lots}x</span>
              </div>
            </div>

            {/* Breakdown Bars */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
              <StatBar label="Tech" value={breakdown.technical} colorClass="bg-blue-500" />
              <StatBar label="Sent" value={breakdown.sentiment} colorClass="bg-pink-500" />
              <div className="col-span-2">
                <StatBar label="ML Model" value={breakdown.ml_model} max={50} colorClass="bg-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between bg-zinc-900/50 p-2 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 w-full pr-2">
            {/* Timeline Bar */}
            <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-600 rounded-full transition-all duration-100 ease-linear" style={{ width: `${timeLeft}%` }} />
            </div>
            <span className="text-[9px] text-zinc-500 font-mono w-8 text-right">{(timeLeft * 0.3).toFixed(0)}s</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onReject(trade.trade_id)}
              className="h-7 w-7 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <X size={14} />
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(trade.trade_id)}
              className="h-7 px-3 text-[10px] gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.25)] rounded-md font-semibold tracking-wide"
            >
              <Check size={12} strokeWidth={3} /> EXECUTE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: History Card (Compact) ---
const HistoryCard = ({ trade }) => {
  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const isRejected = ['REJECTED', 'EXPIRED', 'CANCELLED'].includes(trade.status);

  return (
    <div className={cn(
      "group flex items-center justify-between p-3 mb-1.5 rounded-lg border transition-all cursor-default",
      isWin ? "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20" :
      isLoss ? "bg-red-500/5 border-red-500/10 hover:border-red-500/20" :
      isRejected ? "bg-zinc-900/20 border-zinc-800/50 opacity-60 grayscale hover:opacity-100" :
      "bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/30"
    )}>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={cn(
          "p-1.5 rounded-md border shadow-sm",
          isWin ? "bg-emerald-950 text-emerald-500 border-emerald-900" :
          isLoss ? "bg-red-950 text-red-500 border-red-900" :
          isRejected ? "bg-zinc-900 text-zinc-500 border-zinc-800" :
          "bg-indigo-950 text-indigo-400 border-indigo-900"
        )}>
          {isWin ? <TrendingUp size={12} /> :
           isLoss ? <TrendingDown size={12} /> :
           isRejected ? <Ban size={12} /> :
           <Activity size={12} />}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-bold text-xs truncate", isRejected ? "text-zinc-500 line-through" : "text-zinc-200")}>
              {trade.symbol}
            </span>
          </div>
          {!isRejected && (
            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
              {trade.entry?.price} <ArrowRight size={8} className="opacity-50" /> {trade.exit?.price || '...'}
            </div>
          )}
        </div>
      </div>

      <div className="text-right">
        {isRejected ? (
          <span className="text-[9px] font-bold text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            {trade.status}
          </span>
        ) : (
          <>
            <div className={cn(
              "text-xs font-bold font-mono tracking-tight",
              trade.pnl > 0 ? "text-emerald-400" : trade.pnl < 0 ? "text-red-400" : "text-zinc-400"
            )}>
              {trade.pnl > 0 ? '+' : ''}{trade.pnl}
            </div>
            <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">PNL</div>
          </>
        )}
      </div>
    </div>
  );
};

export default function TradeFeed({ trades, onApprove, onReject }) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll logic
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [trades]);

  // Reverse for Chat Style (Newest at Bottom)
  const displayTrades = [...trades].reverse();

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Modern Header */}
      <div className="h-11 shrink-0 bg-zinc-950/50 border-b border-zinc-800 flex justify-between items-center px-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <BrainCircuit size={14} className="text-indigo-500" />
          <h3 className="font-semibold text-xs text-zinc-200 tracking-wide uppercase">Command Stream</h3>
        </div>
        {/* Sim button removed */}
      </div>

      {/* Scrollable Feed */}
      <div className="flex-1 min-h-0 relative bg-zinc-950/20">
        <ScrollArea className="h-full w-full pr-3" ref={scrollRef}>
          <div className="p-3 flex flex-col justify-end min-h-full">
            {displayTrades.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 opacity-60 space-y-3 pb-10">
                <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                  <Activity size={24} />
                </div>
                <p className="text-xs font-medium">System Idle</p>
              </div>
            )}
            
            {displayTrades.map(trade => (
              trade.status === 'PENDING_APPROVAL' 
                ? <SignalCard key={trade.trade_id} trade={trade} onApprove={onApprove} onReject={onReject} />
                : <HistoryCard key={trade.trade_id} trade={trade} />
            ))}
            <div ref={bottomRef} className="h-1" />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}