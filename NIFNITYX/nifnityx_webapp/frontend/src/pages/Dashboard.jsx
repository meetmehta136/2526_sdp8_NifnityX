import React, { useState, useEffect, useRef } from 'react';
import InfinityChart from '@/components/dashboard/InfinityChart';
import TradeFeed from '@/components/dashboard/TradeFeed';
import { generateInitialData } from '@/data/chartData'; // Fallback to mock data
import { toast } from 'sonner';
import { Bell, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null);
    const [trades, setTrades] = useState([
        {
            trade_id: "T-HIST-01",
            status: "WIN",
            symbol: "NIFTY 24500 CE",
            pnl: 1250,
            entry: { price: 145 },
            exit: { price: 170 }
        }
    ]);

    // 1. Initial Load - Use Mock Data to ensure visual stability
    useEffect(() => {
        setChartData(generateInitialData(300));
    }, []);

    const simulateSignal = () => {
        const newSignal = {
            trade_id: `T-${Date.now()}`,
            status: "PENDING_APPROVAL",
            symbol: "NIFTY 24800 CE",
            setup_name: "Trend Bounce (ML)",
            confidence_score: { total: 84, breakdown: { technical: 70, sentiment: 10, ml_model: 14 } },
            lots: 2,
            entry: { price: 124.50 },
            pnl: 0
        };
        setTrades(prev => [newSignal, ...prev]);

        // Browser-like Notification Toast (Bottom Right)
        toast.custom((t) => (
            <div className="flex w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg p-4 shadow-xl shadow-black/50 items-start gap-4 animate-in slide-in-from-right-full fade-in duration-300">
                <div className="p-2.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 shrink-0">
                    <Bell className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-white">Trade Signal Detected</h3>
                        <span className="text-[10px] text-zinc-500 font-mono">NOW</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-2">
                        <span className="text-indigo-300 font-medium">{newSignal.symbol}</span> identified by ML Engine.
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-medium">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                            {newSignal.confidence_score.total}% Confidence
                        </span>
                    </div>
                </div>
            </div>
        ), { duration: 5000 });
    };

    const handleApprove = (id) => {
        setTrades(prev => prev.map(t => t.trade_id === id ? { ...t, status: "OPEN" } : t));
        toast.success("Trade Executed", { 
            icon: <CheckCircle2 className="text-emerald-500" />,
            description: "Order placed on Angel One"
        });
    };

    const handleReject = (id, reason = "REJECTED") => {
        setTrades(prev => prev.map(t => t.trade_id === id ? { ...t, status: reason } : t));
        if (reason !== "EXPIRED") toast.info("Trade Rejected", { 
            icon: <XCircle className="text-red-500" />,
            description: reason === "EXPIRED" ? "Signal window expired" : "Manual rejection"
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-theme(spacing.20))] w-full">
            {/* Market View (70%) */}
            <section className="flex-1 lg:flex-[0.7] min-h-[400px] lg:min-h-0">
                {/* Always show InfinityChart with data (fallback to mock if API fails/empty) */}
                <InfinityChart ref={chartRef} data={chartData} />
            </section>

            {/* Command Stream (30%) */}
            <section className="flex-1 lg:flex-[0.3] min-h-[300px] lg:min-h-0">
                <TradeFeed 
                    trades={trades} 
                    onApprove={handleApprove} 
                    onReject={handleReject} 
                    onSimulate={simulateSignal}
                />
            </section>
        </div>
    );
}