import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { socket } from "@/lib/socket";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import api from "@/lib/api";

const TradeContext = createContext();

export function useTrades() {
    return useContext(TradeContext);
}

export function TradeProvider({ children }) {
    const [trades, setTrades] = useState([]);
    const location = useLocation();
    const isDashboard = location.pathname === "/" || location.pathname === "/dashboard";

    // ── Initial trade fetch ──
    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get("/trade?limit=50");
                if (res.data && Array.isArray(res.data)) {
                    setTrades(res.data);
                    console.log(`📦 [TradeContext] Loaded ${res.data.length} trades from DB`);
                }
            } catch (err) {
                console.error("📦 [TradeContext] Failed to load trades:", err.response?.status, err.message);
            }
        };
        load();
    }, []);

    // ── Global socket listeners ──
    useEffect(() => {
        const onSignal = (sig) => {
            setTrades((prev) => [sig, ...prev]);

            // Minimal notification — only when NOT on dashboard (dashboard has TradeFeed)
            if (!isDashboard) {
                toast(
                    `New Signal: ${sig.symbol} — ${sig.action || "TRADE"}`,
                    { duration: 3000 }
                );
            }
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
    }, [isDashboard]);

    // ── Trade handlers ──
    const handleApprove = useCallback(async (tradeId) => {
        setTrades((p) => p.map((t) => (t._id === tradeId ? { ...t, status: "OPEN" } : t)));
        try {
            await api.post(`/trade/${tradeId}/approve`, { force: true });
            toast.success("Trade Executed");
        } catch (err) {
            setTrades((p) => p.map((t) => (t._id === tradeId && t.status === "OPEN" ? { ...t, status: "PENDING_APPROVAL" } : t)));
            toast.error(err.response?.data?.message || "Execution Failed");
        }
    }, []);

    const handleReject = useCallback(async (tradeId) => {
        setTrades((p) => p.map((t) => (t._id === tradeId ? { ...t, status: "REJECTED" } : t)));
        try {
            await api.post(`/trade/${tradeId}/reject`, { reason: "User rejected" });
            toast.success("Trade Rejected");
        } catch (_) { }
    }, []);

    const handleExit = useCallback(async (tradeId) => {
        // Optimistic: show "EXITING" spinner immediately
        setTrades((p) => p.map((t) => (t._id === tradeId ? { ...t, status: "EXITING" } : t)));
        try {
            const { data } = await api.post(`/trade/${tradeId}/exit`);
            // Backend now returns { success, trade } with WIN/LOSS + P&L already set
            // Update state directly from response — no need to wait for socket
            if (data.trade) {
                setTrades((p) => p.map((t) => (t._id === tradeId ? data.trade : t)));
                const pnl = data.trade.pnl ?? 0;
                const label = data.trade.status === "WIN" ? "✅ WIN" : "❌ LOSS";
                toast.success(`${label}  ₹${pnl >= 0 ? "+" : ""}${Number(pnl).toFixed(2)}`);
            } else {
                // Fallback: socket event will arrive shortly
                toast.success("Exit command sent");
            }
        } catch (err) {
            // Revert to OPEN on failure
            setTrades((p) => p.map((t) => (t._id === tradeId && t.status === "EXITING" ? { ...t, status: "OPEN" } : t)));
            toast.error(err.response?.data?.message || "Exit failed");
        }
    }, []);

    return (
        <TradeContext.Provider value={{ trades, handleApprove, handleReject, handleExit }}>
            {children}
        </TradeContext.Provider>
    );
}