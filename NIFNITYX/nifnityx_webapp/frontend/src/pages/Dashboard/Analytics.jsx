import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchAnalytics } from "@/lib/api";
import { toast } from "sonner";
import {
    TrendingUp, TrendingDown, Activity, Target, RefreshCcw,
    Brain, FlaskConical, DollarSign, BarChart3,
    Gauge, ArrowDownRight
} from "lucide-react";
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis,
    Tooltip, Cell, Pie, PieChart, Scatter, ScatterChart, ZAxis
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

// ═══════════════════════════════════════════════════════════
// ANALYTICS — 4-Zone Performance Dashboard
// ═══════════════════════════════════════════════════════════

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [mode, setMode] = useState("PAPER");
    const [timeRange, setTimeRange] = useState("all");
    const [strategy, setStrategy] = useState("sniper");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const end = new Date();
            const start = new Date();
            if (timeRange === "7d") start.setDate(end.getDate() - 7);
            if (timeRange === "30d") start.setDate(end.getDate() - 30);
            if (timeRange === "90d") start.setDate(end.getDate() - 90);
            if (timeRange === "all") start.setFullYear(2020);

            const { data: analyticsData } = await fetchAnalytics({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                mode,
                strategy,
            });
            setData(analyticsData);
        } catch (error) {
            toast.error("Failed to load analytics");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [mode, timeRange, strategy]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── DERIVED DATA (useMemo) ──

    const maxDrawdown = useMemo(() => {
        if (!data?.equity_curve?.length) return 0;
        let peak = 0;
        let mdd = 0;
        data.equity_curve.forEach((point) => {
            const cum = point.cumulative_pnl;
            if (cum > peak) peak = cum;
            const dd = cum - peak;
            if (dd < mdd) mdd = dd;
        });
        return mdd;
    }, [data?.equity_curve]);

    const kpis = useMemo(() => {
        if (!data?.kpis) return null;
        return {
            totalPnl: data.kpis.total_pnl || 0,
            winRate: data.kpis.win_rate || 0,
            profitFactor: data.kpis.profit_factor || 0,
            totalTrades: data.kpis.total_trades || 0,
            maxDrawdown,
        };
    }, [data?.kpis, maxDrawdown]);

    const equityCurveData = useMemo(() => data?.equity_curve || [], [data?.equity_curve]);
    const dailyPnlData = useMemo(() => data?.daily_pnl || [], [data?.daily_pnl]);
    const frictionDonutData = useMemo(() => data?.friction_donut || [], [data?.friction_donut]);
    const mlScatterData = useMemo(() => data?.ml_scatter || [], [data?.ml_scatter]);
    const mlTierData = useMemo(() => data?.ml_tier_win_rates || [], [data?.ml_tier_win_rates]);
    const strategies = useMemo(() => ["sniper", "balanced", "aggressive", "conservative"], []);

    // ── RENDER ──

    if (loading && !data) return <AnalyticsSkeleton />;

    const hasTrades = kpis && kpis.totalTrades > 0;

    return (
        <div className="flex flex-col max-w-[1600px] mx-auto p-1 gap-4">

            {/* Header — matches TradeHistory */}
            <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                        Analytics
                        {hasTrades && (
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono font-normal text-xs">
                                {kpis.totalTrades} Trades
                            </Badge>
                        )}
                    </h1>
                    <p className="text-zinc-400 text-xs mt-1">Performance intelligence across all strategies and execution modes.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 h-8 text-xs">
                    <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh Data
                </Button>
            </div>

            {/* Filters Toolbar — matches TradeHistory */}
            <div className="flex-none flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
                <Select value={strategy} onValueChange={setStrategy}>
                    <SelectTrigger className="w-full sm:w-[180px] h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-300">
                        <SelectValue placeholder="Strategy" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs">
                        {strategies.map((s) => (
                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="w-full sm:w-[120px] h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-300">
                        <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs">
                        <SelectItem value="PAPER">Paper</SelectItem>
                        <SelectItem value="LIVE">Live</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full sm:w-[150px] h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-300">
                        <SelectValue placeholder="Range" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs">
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                        <SelectItem value="90d">Last 3 Months</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {!hasTrades ? (
                <EmptyState />
            ) : (
                <>
                    {/* ═══ ZONE 1: KPI CARDS ═══ */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatsCard
                            title="Net P&L"
                            value={`₹${kpis.totalPnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                            icon={DollarSign}
                            valueClass={kpis.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
                            sub={`${kpis.totalTrades} closed trades`}
                        />
                        <StatsCard
                            title="Win Rate"
                            value={`${kpis.winRate}%`}
                            icon={Target}
                            valueClass="text-blue-400"
                            sub={kpis.winRate >= 55 ? "Strong edge" : "Needs improvement"}
                        />
                        <StatsCard
                            title="Profit Factor"
                            value={kpis.profitFactor}
                            icon={Gauge}
                            valueClass="text-purple-400"
                            sub={kpis.profitFactor > 1.5 ? "Healthy" : kpis.profitFactor > 1 ? "Marginal" : "Negative"}
                        />
                        <StatsCard
                            title="Max Drawdown"
                            value={`₹${Math.abs(kpis.maxDrawdown).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                            icon={ArrowDownRight}
                            valueClass="text-orange-400"
                            sub="Peak to trough"
                        />
                    </div>

                    {/* ═══ ZONE 2: PERFORMANCE TIMELINES ═══ */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                        {/* Cumulative PnL Curve */}
                        <Card className="xl:col-span-7 bg-zinc-950 border-zinc-800 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Cumulative P&L
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Account growth trajectory over time</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[320px]">
                                <ChartContainer config={{ cumulative_pnl: { label: "Cumulative P&L", color: "hsl(142, 76%, 36%)" } }} className="h-full w-full">
                                    <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="fillPnlPos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.05} />
                                            </linearGradient>
                                            <linearGradient id="fillPnlNeg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                                            tick={{ fill: '#71717a', fontSize: 10 }}
                                            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area
                                            type="monotone" dataKey="cumulative_pnl" strokeWidth={2}
                                            stroke={kpis.totalPnl >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                                            fill={kpis.totalPnl >= 0 ? "url(#fillPnlPos)" : "url(#fillPnlNeg)"}
                                            fillOpacity={0.4}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Daily PnL Bar Chart */}
                        <Card className="xl:col-span-5 bg-zinc-950 border-zinc-800 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" /> Daily P&L
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Profit/loss distribution per day</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[320px]">
                                <ChartContainer config={{}} className="h-full w-full">
                                    <BarChart data={dailyPnlData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                                            tick={{ fill: '#71717a', fontSize: 10 }}
                                            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        />
                                        <ChartTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltipContent />} />
                                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                            {dailyPnlData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ═══ ZONE 3 + ZONE 4 ═══ */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                        {/* Zone 3: Friction Analysis — Gross vs Net Donut */}
                        <Card className="bg-zinc-950 border-zinc-800 shadow-lg flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-amber-500" /> Friction Analysis
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Gross vs net breakdown</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 pb-0">
                                <ChartContainer config={{}} className="mx-auto aspect-square max-h-[220px]">
                                    <PieChart>
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                        <Pie
                                            data={frictionDonutData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={55}
                                            outerRadius={85}
                                            strokeWidth={5}
                                        >
                                            {frictionDonutData.map((entry, i) => (
                                                <Cell key={`friction-${i}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                            </CardContent>
                            <div className="p-4 pt-2 flex justify-center gap-4 text-[11px] text-zinc-400">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} /> Net Profit
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(38, 92%, 50%)" }} /> Brokerage
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} /> Govt Taxes
                                </div>
                            </div>
                        </Card>

                        {/* Zone 4a: ML Accuracy Scatter Plot */}
                        <Card className="bg-zinc-950 border-zinc-800 shadow-lg flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-violet-500" /> ML Accuracy
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">ML score vs actual P&L</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-[280px]">
                                {mlScatterData.length > 0 ? (
                                    <ChartContainer config={{}} className="h-full w-full max-h-[280px]">
                                        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                            <XAxis type="number" dataKey="ml_score" name="ML Score" domain={[0, 35]}
                                                tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false}
                                            />
                                            <YAxis type="number" dataKey="pnl" name="Net P&L"
                                                tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false}
                                                tickFormatter={(v) => `₹${v}`}
                                            />
                                            <ZAxis range={[40, 120]} />
                                            <Tooltip
                                                cursor={{ strokeDasharray: '3 3' }}
                                                content={({ payload }) => {
                                                    if (!payload?.length) return null;
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                                                            <p className="text-zinc-400">ML Score: <span className="text-white">{d.ml_score}</span></p>
                                                            <p className="text-zinc-400">P&L: <span className={d.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>₹{d.pnl?.toFixed(0)}</span></p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Scatter data={mlScatterData}>
                                                {mlScatterData.map((entry, i) => (
                                                    <Cell
                                                        key={`scatter-${i}`}
                                                        fill={entry.status === "WIN" ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                                                        fillOpacity={0.7}
                                                    />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                                        No ML data available yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Zone 4b: Win Rate by ML Tier */}
                        <Card className="bg-zinc-950 border-zinc-800 shadow-lg flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <FlaskConical className="w-4 h-4 text-cyan-500" /> ML Tier Win Rate
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Performance by signal quality</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-[280px]">
                                {mlTierData.some(t => t.total > 0) ? (
                                    <ChartContainer config={{}} className="h-full w-full max-h-[280px]">
                                        <BarChart data={mlTierData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                            <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false}
                                                tick={{ fill: '#71717a', fontSize: 10 }}
                                                tickFormatter={(v) => `${v}%`}
                                            />
                                            <YAxis type="category" dataKey="tier" tickLine={false} axisLine={false}
                                                tick={{ fill: '#a1a1aa', fontSize: 11 }} width={100}
                                            />
                                            <ChartTooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                                content={({ payload }) => {
                                                    if (!payload?.length) return null;
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                                                            <p className="text-zinc-400">{d.tier}</p>
                                                            <p className="text-white">Win Rate: {d.win_rate}%</p>
                                                            <p className="text-zinc-500">{d.total} trades</p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Bar dataKey="win_rate" radius={[0, 4, 4, 0]}>
                                                {mlTierData.map((entry, index) => (
                                                    <Cell
                                                        key={`tier-${index}`}
                                                        fill={
                                                            entry.tier.includes("High") ? "hsl(142, 76%, 36%)" :
                                                                entry.tier.includes("Medium") ? "hsl(38, 92%, 50%)" :
                                                                    "hsl(0, 84%, 60%)"
                                                        }
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                                        No ML tier data available yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </>
            )}
        </div>
    );
}

// ── COMPONENTS (matching TradeHistory / Account patterns) ──

function StatsCard({ title, value, icon: Icon, valueClass, sub }) {
    return (
        <Card className="bg-zinc-950 border-zinc-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                <Icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueClass || "text-white"}`}>
                    {value}
                </div>
                {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
            </CardContent>
        </Card>
    );
}

function EmptyState() {
    return (
        <Card className="bg-zinc-950 border-zinc-800 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            <CardContent className="flex flex-col items-center justify-center py-24 text-center relative z-10">
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 mb-5">
                    <BarChart3 className="w-10 h-10 text-zinc-600" />
                </div>
                <h2 className="text-lg font-bold text-zinc-200 mb-2">Analytics Dashboard</h2>
                <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                    Waiting for closed trades. Approve signals from the Dashboard, then exit positions
                    or wait for SL/Target hits — analytics will populate automatically.
                </p>
                <div className="flex items-center gap-1.5 mt-4 text-[10px] text-zinc-600 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse" />
                    Listening for trade closures
                </div>
            </CardContent>
        </Card>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="flex flex-col max-w-[1600px] mx-auto p-1 gap-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-28 bg-zinc-900 rounded" />
                <Skeleton className="h-8 w-28 bg-zinc-900 rounded" />
            </div>
            <Skeleton className="h-12 w-full bg-zinc-900 rounded-xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Skeleton className="h-[88px] bg-zinc-900 rounded-xl" />
                <Skeleton className="h-[88px] bg-zinc-900 rounded-xl" />
                <Skeleton className="h-[88px] bg-zinc-900 rounded-xl" />
                <Skeleton className="h-[88px] bg-zinc-900 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <Skeleton className="xl:col-span-7 h-[360px] bg-zinc-900 rounded-xl" />
                <Skeleton className="xl:col-span-5 h-[360px] bg-zinc-900 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Skeleton className="h-[360px] bg-zinc-900 rounded-xl" />
                <Skeleton className="h-[360px] bg-zinc-900 rounded-xl" />
                <Skeleton className="h-[360px] bg-zinc-900 rounded-xl" />
            </div>
        </div>
    );
}
