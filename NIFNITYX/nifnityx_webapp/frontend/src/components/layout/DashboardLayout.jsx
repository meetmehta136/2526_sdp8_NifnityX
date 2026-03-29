import React, { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { TradeProvider } from "@/contexts/TradeContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api, { fetchActiveStrategy, setActiveStrategy } from "@/lib/api";
import { ArrowUpRight, ArrowDownRight, Crosshair, Activity, Zap, Shield, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

const STRATEGY_META = {
    sniper: { label: "Sniper", icon: Crosshair, color: "text-purple-400" },
    balanced: { label: "Balanced", icon: Activity, color: "text-blue-400" },
    aggressive: { label: "Aggressive", icon: Zap, color: "text-amber-400" },
    conservative: { label: "Conservative", icon: Shield, color: "text-emerald-400" },
};

// ── Real-time Clock Hook ──
function useRealtimeClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return time;
}

export default function DashboardLayout({ user }) {
    const [price, setPrice] = useState(null);
    const [stats, setStats] = useState({ totalPnL: 0, openTrades: 0 });
    const clock = useRealtimeClock();

    // Strategy state
    const [activeStrategy, setActiveStrategyState] = useState("sniper");
    const [availableStrategies, setAvailableStrategies] = useState(["sniper", "balanced", "aggressive", "conservative"]);
    const [strategySwitching, setStrategySwitching] = useState(false);

    const syncData = useCallback(async () => {
        try {
            const [priceRes, statsRes] = await Promise.allSettled([
                api.get("/market/price?symbol=NIFTY"),
                api.get(`/trade/stats?mode=${user?.settings?.tradingMode || 'paper'}`),
            ]);
            if (priceRes.status === 'fulfilled') setPrice(priceRes.value.data);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        } catch (e) { console.error("HUD Sync failed", e); }
    }, [user]);

    // Fetch active strategy on mount
    useEffect(() => {
        const loadStrategy = async () => {
            try {
                const { data } = await fetchActiveStrategy();
                setActiveStrategyState(data.active);
                if (data.available?.length) setAvailableStrategies(data.available);
            } catch (_) { }
        };
        loadStrategy();
    }, []);

    useEffect(() => {
        syncData();
        const interval = setInterval(syncData, 60000);
        return () => clearInterval(interval);
    }, [syncData]);

    // Handle strategy change
    const handleStrategyChange = async (newStrategy) => {
        if (newStrategy === activeStrategy) return;
        const prev = activeStrategy;
        setStrategySwitching(true);
        setActiveStrategyState(newStrategy);

        try {
            const { data } = await setActiveStrategy(newStrategy);
            if (data.warning) {
                toast.warning(data.warning);
            } else {
                toast.success(`Strategy switched to ${newStrategy.toUpperCase()}`);
            }
        } catch (err) {
            setActiveStrategyState(prev);
            const msg = err.response?.data?.message || "Failed to change strategy";
            toast.error(msg);
        } finally {
            setStrategySwitching(false);
        }
    };

    const isUp = price?.change >= 0;
    const isMarketOpen = price?.marketState === 'REGULAR';
    const pnl = stats?.totalPnL || 0;

    // Format clock as IST
    const clockStr = clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });


    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
                <AppSidebar user={user} />

                {/* Main Content Wrapper */}
                <main className="flex-1 flex flex-col min-w-0 h-full bg-background transition-all duration-300 ease-in-out">

                    {/* Top Header / HUD — same h-14 as sidebar */}
                    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur-md px-4 z-10 sticky top-0">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger className="text-muted-foreground hover:text-foreground md:hidden" />
                            <Separator orientation="vertical" className="mr-2 h-4 bg-border md:hidden" />

                            {/* Company Name */}
                            <h2 className="font-semibold text-sm text-foreground tracking-wide hidden sm:block">
                                NifnityX
                            </h2>
                        </div>

                        {/* Session HUD (Right Side) */}
                        <div className="ml-auto flex items-center gap-3 md:gap-4 text-xs font-mono">

                            {/* Market Status */}
                            {isMarketOpen ? (
                                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </div>
                                    <span className="font-bold text-emerald-500 tracking-wider text-[10px]">LIVE</span>
                                </div>
                            ) : (
                                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-800/50 border border-zinc-700/30">
                                    <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
                                    <span className="font-bold text-zinc-500 tracking-wider text-[10px]">CLOSED</span>
                                </div>
                            )}

                            <div className="hidden md:block h-4 w-[1px] bg-zinc-800" />

                            {/* Real-time Clock */}
                            <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                                <Clock size={10} className="text-zinc-600" />
                                <span className="tabular-nums">{clockStr}</span>
                                <span className="text-zinc-700">IST</span>
                            </div>

                            <div className="hidden lg:block h-4 w-[1px] bg-zinc-800" />

                            {/* Strategy Selector */}
                            <div className="hidden md:flex items-center">
                                <Select value={activeStrategy} onValueChange={handleStrategyChange} disabled={strategySwitching}>
                                    <SelectTrigger className="h-7 w-[130px] bg-zinc-900/60 border-zinc-800 text-[11px] text-zinc-300 font-semibold px-2 gap-1 focus:ring-0">
                                        {strategySwitching ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <SelectValue />
                                        )}
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs">
                                        {availableStrategies.map((s) => {
                                            const meta = STRATEGY_META[s];
                                            const Icon = meta?.icon || Crosshair;
                                            return (
                                                <SelectItem key={s} value={s}>
                                                    <span className="flex items-center gap-2">
                                                        <Icon className={`h-3 w-3 ${meta?.color || ""}`} />
                                                        {meta?.label || s}
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="hidden md:block h-4 w-[1px] bg-zinc-800" />

                            {/* NIFTY 50 Ticker */}
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end leading-none gap-0.5">
                                    <span className="text-[9px] text-zinc-500 font-bold tracking-wider uppercase">NIFTY 50</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-100 text-sm">
                                            {price?.price ? `₹${price.price.toLocaleString('en-IN')}` : "..."}
                                        </span>
                                        {price?.changePercent != null && (
                                            <span className={`flex items-center text-[10px] font-semibold px-1 rounded-sm ${isUp ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'
                                                }`}>
                                                {isUp ? <ArrowUpRight size={8} className="mr-0.5" /> : <ArrowDownRight size={8} className="mr-0.5" />}
                                                {isUp ? '+' : ''}{price.changePercent?.toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block h-4 w-[1px] bg-zinc-800" />

                            {/* Session P&L Section */}
                            <div className="hidden lg:flex items-center gap-4">
                                <div className="flex flex-col items-end leading-none gap-0.5">
                                    <span className="text-[9px] text-zinc-500 font-bold tracking-wider uppercase">NET P&L</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-sm ${pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-zinc-100'}`}>
                                            {pnl > 0 ? "+" : ""}₹{Math.abs(pnl).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </header>

                    {/* Page Content Outlet */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-[url('/grid-pattern.svg')] bg-fixed bg-center">
                        <TradeProvider>
                            <Outlet />
                        </TradeProvider>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}
