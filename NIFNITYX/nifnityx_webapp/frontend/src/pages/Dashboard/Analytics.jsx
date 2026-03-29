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
    Gauge, ArrowDownRight, Clock3, Zap, Flame, X
} from "lucide-react";
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis,
    Tooltip, Cell, Pie, PieChart, Scatter, ScatterChart, ZAxis, ReferenceLine
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

        // ── WebSocket Live Updates ──
        const onStatsUpdate = () => {
            console.log("🔄 [Socket] Stats update received, refreshing Analytics...");
            loadData();
        };

        import("@/lib/socket").then(({ socket }) => {
            socket.on("stats_update", onStatsUpdate);
        });

        return () => {
            import("@/lib/socket").then(({ socket }) => {
                socket.off("stats_update", onStatsUpdate);
            });
        };
    }, [loadData]);

    // ── DERIVED DATA (useMemo) ──

    const kpis = useMemo(() => {
        if (!data?.kpis) return null;
        return {
            totalPnl: data.kpis.total_pnl || 0,
            winRate: data.kpis.win_rate || 0,
            profitFactor: data.kpis.profit_factor || 0,
            totalTrades: data.kpis.total_trades || 0,
            maxDrawdown: data.kpis.max_drawdown || 0,
            maxDrawdownPer: data.kpis.max_drawdown_per || 0,
            sharpe: data.kpis.sharpe_ratio || 0,
            sortino: data.kpis.sortino_ratio || 0,
            riskReward: data.kpis.risk_reward || 0,
            avgWin: data.kpis.avg_win || 0,
            avgLoss: data.kpis.avg_loss || 0,
            maxWinStreak: data.kpis.max_win_streak || 0,
            maxLossStreak: data.kpis.max_loss_streak || 0,
        };
    }, [data?.kpis]);

    const equityCurveData = useMemo(() => data?.equity_curve || [], [data?.equity_curve]);
    const drawdownCurveData = useMemo(() => data?.drawdown_curve || [], [data?.drawdown_curve]);
    const dailyPnlData = useMemo(() => data?.daily_pnl || [], [data?.daily_pnl]);
    const frictionDonutData = useMemo(() => data?.friction_donut || [], [data?.friction_donut]);
    const mlScatterData = useMemo(() => data?.ml_scatter || [], [data?.ml_scatter]);
    const timeOfDayData = useMemo(() => data?.time_of_day_pnl || [], [data?.time_of_day_pnl]);
    const strategies = useMemo(() => ["sniper", "balanced", "aggressive", "conservative"], []);

    // ── RENDER ──

    if (loading && !data) return <AnalyticsSkeleton />;

    const hasTrades = kpis && kpis.totalTrades > 0;

    return (
        <div className="flex flex-col max-w-[1600px] mx-auto p-1 gap-4">

            {/* Header */}
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

            {/* Filters Toolbar */}
            <div className="flex-none flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto">
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

                {(strategy !== "sniper" || mode !== "PAPER" || timeRange !== "all") && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                            setStrategy("sniper");
                            setMode("PAPER");
                            setTimeRange("all");
                        }} 
                        className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800 ml-auto"
                    >
                        <X size={14} />
                    </Button>
                )}
            </div>

            {!hasTrades ? (
                <EmptyState />
            ) : (
                <>
                    {/* ═══ ZONE 1: PRIMARY KPI CARDS ═══ */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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
                            title="Sharpe Ratio"
                            value={kpis.sharpe}
                            icon={Gauge}
                            valueClass="text-purple-400"
                            sub={kpis.sharpe > 1.5 ? "Exceptional" : kpis.sharpe > 0 ? "Positive" : "Risky"}
                        />
                        <StatsCard
                            title="Max Drawdown"
                            value={`${kpis.maxDrawdownPer}%`}
                            icon={ArrowDownRight}
                            valueClass="text-orange-400"
                            sub={`₹${Math.abs(kpis.maxDrawdown).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                        />
                    </div>

                    {/* ═══ ZONE 2: PERFORMANCE TIMELINES ═══ */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                        <Card className="xl:col-span-12 bg-zinc-950 border-zinc-800 shadow-lg overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Equity Curve
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Account growth trajectory with capital visualization</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[360px] pt-4">
                                <ChartContainer config={{ capital: { label: "Equity", color: "hsl(142, 76%, 45%)" } }} className="h-full w-full">
                                    <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="fillPnlMain" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                                            tick={{ fill: '#71717a', fontSize: 10 }}
                                            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 10 }}
                                            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area
                                            type="monotone" dataKey="capital" strokeWidth={3}
                                            stroke="hsl(142, 76%, 45%)"
                                            fill="url(#fillPnlMain)"
                                            fillOpacity={0.4}
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ═══ ZONE 3: RISK & RECOVERY ═══ */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                        <Card className="xl:col-span-8 bg-zinc-950 border-zinc-800 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <ArrowDownRight className="w-4 h-4 text-red-500" /> Drawdown Analysis
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Capital degradation from peak levels</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[280px]">
                                <ChartContainer config={{ drawdown: { label: "Drawdown", color: "hsl(0, 84%, 60%)" } }} className="h-full w-full">
                                    <AreaChart data={drawdownCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="fillDD" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.01} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                        <XAxis dataKey="date" hide />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Area
                                            type="step" dataKey="drawdown" strokeWidth={1.5}
                                            stroke="hsl(0, 84%, 60%)"
                                            fill="url(#fillDD)"
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card className="xl:col-span-4 bg-zinc-950 border-zinc-800 shadow-lg flex flex-col">
                            <CardHeader className="pb-2 border-b border-zinc-800/40 mb-3">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-violet-500" /> Advanced Metrics
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Risk, reward & statistical edge factors</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 flex-1 px-4 pb-4">
                                {/* Expectancy Block - Featured stat */}
                                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Expectancy</p>
                                            <Target className="w-3.5 h-3.5 text-zinc-500" />
                                        </div>
                                        <div className="flex items-baseline gap-1.5 mb-4">
                                            <p className="text-3xl font-mono font-bold text-zinc-100">
                                                ₹{((kpis.avgWin * (kpis.winRate/100)) - (kpis.avgLoss * (1 - kpis.winRate/100))).toFixed(0)}
                                            </p>
                                            <span className="text-[10px] text-zinc-500 font-medium uppercase">/ trade</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-500/20">
                                                <p className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-wider">Avg Win</p>
                                                <p className="text-[13px] font-bold text-emerald-400 mt-0.5 tabular-nums">₹{kpis.avgWin.toFixed(0)}</p>
                                            </div>
                                            <div className="bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                                                <p className="text-[9px] text-red-500/80 font-bold uppercase tracking-wider">Avg Loss</p>
                                                <p className="text-[13px] font-bold text-red-400 mt-0.5 tabular-nums">₹{kpis.avgLoss.toFixed(0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Grid of 4 secondary stats */}
                                <div className="grid grid-cols-2 gap-3 flex-1">
                                    <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/50 flex flex-col justify-center">
                                         <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1 flex items-center justify-between">R:R Ratio <Activity className="w-3 h-3 text-zinc-600"/></p>
                                         <p className="text-lg font-mono font-bold text-zinc-200">{kpis.riskReward}</p>
                                    </div>
                                    <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/50 flex flex-col justify-center">
                                         <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1 flex items-center justify-between">Sortino <Gauge className="w-3 h-3 text-zinc-600"/></p>
                                         <p className="text-lg font-mono font-bold text-zinc-200">{kpis.sortino}</p>
                                    </div>
                                    <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/50 flex flex-col justify-center">
                                         <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1 flex items-center justify-between">Win Streak <Flame className="w-3 h-3 text-emerald-600/50"/></p>
                                         <p className="text-lg font-mono font-bold text-emerald-400">{kpis.maxWinStreak}</p>
                                    </div>
                                    <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/50 flex flex-col justify-center">
                                         <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1 flex items-center justify-between">Loss Streak <TrendingDown className="w-3 h-3 text-red-600/50"/></p>
                                         <p className="text-lg font-mono font-bold text-red-400">{kpis.maxLossStreak}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ═══ ZONE 4: DISTRIBUTION & ANALYSIS ═══ */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        <Card className="bg-zinc-950 border-zinc-800 shadow-lg flex flex-col">
                            <CardHeader className="pb-2 border-b border-zinc-800/40 mb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" /> Daily Distribution
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Net P&L across trading sessions</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[230px] px-2 pb-4">
                                <ChartContainer config={{}} className="h-full w-full">
                                    <BarChart data={dailyPnlData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                        <XAxis dataKey="date" hide />
                                        <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                            {dailyPnlData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-950 border-zinc-800 shadow-lg flex flex-col">
                            <CardHeader className="pb-2 border-b border-zinc-800/40 mb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-amber-500" /> Friction Cost
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Capital decay via broker fees & taxes</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 pb-4">
                                <ChartContainer config={{}} className="mx-auto aspect-square max-h-[170px]">
                                    <PieChart>
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                        <Pie
                                            data={frictionDonutData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={45}
                                            outerRadius={65}
                                            strokeWidth={5}
                                        >
                                            {frictionDonutData.map((entry, i) => (
                                                <Cell key={`friction-${i}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                                <div className="p-3 pt-2 flex flex-wrap justify-center gap-3 text-[10px] text-zinc-400">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Net</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Brokerage</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Taxes</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-950 border-zinc-800 shadow-lg flex flex-col">
                            <CardHeader className="pb-2 border-b border-zinc-800/40 mb-2">
                                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-violet-500" /> ML Accuracy Profile
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">Trade profitability correlated against ML confidence</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-[230px] px-2 pb-4">
                                {mlScatterData.length > 0 ? (
                                    <ChartContainer config={{}} className="h-full w-full max-h-[230px]">
                                        <ScatterChart margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                                            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                                            <XAxis 
                                                type="number" 
                                                dataKey="ml_score" 
                                                name="ML Score" 
                                                tick={{ fill: '#71717a', fontSize: 10 }}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={['auto', 'auto']}
                                            />
                                            <YAxis 
                                                type="number" 
                                                dataKey="pnl" 
                                                name="P&L" 
                                                tick={{ fill: '#71717a', fontSize: 10 }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                                            />
                                            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                            <Tooltip
                                                cursor={{ strokeDasharray: '3 3', stroke: '#3f3f46' }}
                                                content={({ payload }) => {
                                                    if (!payload?.length) return null;
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                                                            <p className="text-zinc-400">ML Conf: <span className="text-white font-mono">{d.ml_score}</span></p>
                                                            <p className="text-zinc-400">P&L: <span className={d.pnl >= 0 ? "text-emerald-400 font-mono" : "text-red-400 font-mono"}>₹{d.pnl?.toFixed(0)}</span></p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Scatter data={mlScatterData}>
                                                {mlScatterData.map((entry, i) => (
                                                    <Cell
                                                        key={`scatter-${i}`}
                                                        fill={entry.status === "WIN" ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)"}
                                                        fillOpacity={0.8}
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
                    </div>
                </>
            )}
        </div>
    );
}

// ── COMPONENTS (matching TradeHistory / Account patterns) ──

function StatsCard({ title, value, icon: Icon, valueClass, sub }) {
    return (
        <Card className="bg-zinc-950 border-zinc-800 shadow-lg py-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0  pt-3 px-4">
                <CardTitle className="text-xs font-medium text-zinc-400">{title}</CardTitle>
                <Icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
                <div className={`text-xl sm:text-2xl font-bold tracking-tight ${valueClass || "text-white"}`}>
                    {value}
                </div>
                {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
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
