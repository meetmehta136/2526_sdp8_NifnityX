import React, { useState, useEffect, useRef } from "react";
import InfinityChart from "@/components/dashboard/InfinityChart";
import TradeFeed from "@/components/dashboard/TradeFeed";
import { generateInitialData } from "@/data/chartData";
import { toast } from "sonner";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { socket } from "@/lib/socket"; 
import api from "@/lib/api";

export default function Dashboard() {
  const [chartData, setChartData] = useState([]);
  const chartRef = useRef(null);
  const [trades, setTrades] = useState([]);

  // 1. Initial Load
  useEffect(() => {
    setChartData(generateInitialData(300));
    
    // Fetch History
    const fetchRecentTrades = async () => {
      try {
        const res = await api.get('/trades?limit=20');
        if(res.data && Array.isArray(res.data)) {
             setTrades(res.data);
        }
      } catch (e) {
        console.error("Sync error:", e);
      }
    };
    fetchRecentTrades();
  }, []);

  // 2. Real-Time Listener
  useEffect(() => {
    // ... (Socket logic same as before) ...
    const onNewSignal = (newSignal) => {
      console.log("⚡ Signal:", newSignal);
      setTrades((prev) => [newSignal, ...prev]);
      
      toast.custom((t) => (
        <div className="flex w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg p-4 shadow-xl shadow-black/50 items-start gap-4 animate-in slide-in-from-right-full fade-in duration-300">
          <div className="p-2.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 shrink-0">
            <Bell className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">Signal Detected</h3>
            <p className="text-xs text-zinc-400">
              <span className="text-indigo-300 font-medium">{newSignal.symbol}</span> via {newSignal.setup_name}
            </p>
          </div>
        </div>
      ), { duration: 5000 });
    };

    socket.on("new-trade-signal", onNewSignal);
    return () => socket.off("new-trade-signal", onNewSignal);
  }, []);

  // 3. DECISION HANDLERS (Connects to DB)

  const handleApprove = async (tradeId) => {
    // 1. Optimistic UI Update (Instant feedback)
    setTrades((prev) =>
      prev.map((t) => (t.trade_id === tradeId ? { ...t, status: "OPEN" } : t))
    );

    try {
      // 2. Sync with Backend
      await api.put(`/trades/${tradeId}/decision`, { decision: "OPEN" });
      
      toast.success("Trade Executed", {
        icon: <CheckCircle2 className="text-emerald-500" />,
        description: "Order sent to execution engine"
      });
    } catch (error) {
      console.error("Execution failed:", error);
      toast.error("Execution Sync Failed", { description: "Check network connection" });
      // Revert UI if needed (optional)
    }
  };

  const handleReject = async (tradeId, reason = "REJECTED") => {
    // 1. Optimistic UI Update
    setTrades((prev) =>
      prev.map((t) => (t.trade_id === tradeId ? { ...t, status: reason } : t))
    );

    const isExpired = reason === "EXPIRED";

    try {
      // 2. Sync with Backend
      // Map reason to status: if Expired, status is EXPIRED, else REJECTED
      const status = isExpired ? "EXPIRED" : "REJECTED";
      await api.put(`/trades/${tradeId}/decision`, { decision: status, reason });

      if (!isExpired) {
        toast.info("Trade Rejected", {
          icon: <XCircle className="text-red-500" />
        });
      }
    } catch (error) {
      console.error("Rejection sync failed:", error);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-theme(spacing.20))] w-full">
      <section className="flex-1 lg:flex-[0.7] min-h-[400px] lg:min-h-0">
        <InfinityChart ref={chartRef} data={chartData} />
      </section>
      <section className="flex-1 lg:flex-[0.3] min-h-[300px] lg:min-h-0">
        <TradeFeed
          trades={trades}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </section>
    </div>
  );
}