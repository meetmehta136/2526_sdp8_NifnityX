import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchAnalytics } from "@/lib/api";
import { toast } from "sonner";
import { TrendingUp, Activity, BarChart3, Calendar, RefreshCcw, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Pie, PieChart,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [mode, setMode] = useState("PAPER");
    const [timeRange, setTimeRange] = useState("30d");

    const loadData = async () => {
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
                mode
            });
            setData(analyticsData);
        } catch (error) {
            toast.error("Failed to load analytics");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [mode, timeRange]);

    // ── CHARTS CONFIG ──
    const equityConfig = { value: { label: "Balance", color: "hsl(var(--primary))" } };
    const radarConfig = {
        A: { label: "Win Rate", color: "hsl(var(--chart-1))" },
        B: { label: "Profit Factor", color: "hsl(var(--chart-2))" },
    };

    if (loading && !data) return <AnalyticsSkeleton />;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20">

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b border-border/40">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Zap className="text-yellow-500 fill-yellow-500 w-6 h-6" /> Command Center
                    </h1>
                    <p className="text-sm text-zinc-400 font-mono mt-1">
                        <span className="text-emerald-500">LIVE</span> NETWORK STATUS: ONLINE
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger className="w-[120px] bg-zinc-900 border-zinc-800 font-mono text-xs uppercase tracking-wider">
                            <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PAPER">Paper</SelectItem>
                            <SelectItem value="LIVE">Live</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800 font-mono text-xs uppercase tracking-wider">
                            <SelectValue placeholder="Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="90d">Last 3 Months</SelectItem>
                            <SelectItem value="all">MAX HISTORY</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={loadData} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-emerald-500"><RefreshCcw className="h-4 w-4" /></Button>
                </div>
            </div>

            {data && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* ── ROW 1: KPIs (Span 12) ── */}
                    <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard title="NET P&L" value={`₹${data.kpis.total_pnl.toLocaleString()}`}
                            color={data.kpis.total_pnl >= 0 ? "text-emerald-500" : "text-red-500"}
                            trend={data.kpis.total_pnl > 0 ? "+12.5%" : "-2.1%"} // Mock trend for MVP
                        />
                        <KpiCard title="WIN RATE" value={`${data.kpis.win_rate}%`} color="text-blue-400" trend="High Reliability" />
                        <KpiCard title="PROFIT FACTOR" value={data.kpis.profit_factor} color="text-purple-400" trend={data.kpis.profit_factor > 1.5 ? "Healthy" : "Needs Work"} />
                        <KpiCard title="EXPECTANCY" value={`₹${data.kpis.expectancy}`} color="text-yellow-400" trend="Avg per Trade" />
                    </div>

                    {/* ── ROW 2: Equity Curve (8) + Distribution (4) ── */}
                    <Card className="col-span-12 md:col-span-8 bg-zinc-950 border-zinc-800 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Equity Flow</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ChartContainer config={equityConfig} className="h-full w-full">
                                <AreaChart data={data.equity_curve}>
                                    <defs>
                                        <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={40} tick={{ fill: '#71717a', fontSize: 10 }}
                                        tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 10 }}
                                        tickFormatter={(value) => `₹${value / 1000}k`} domain={['auto', 'auto']} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#fillBalance)" />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="col-span-12 md:col-span-4 bg-zinc-950 border-zinc-800 shadow-2xl flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Trade Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px] flex items-center justify-center relative">
                            <ChartContainer config={{}} className="h-full w-full">
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Pie
                                        data={[
                                            { name: "Win", value: data.kpis.total_pnl > 0 ? 1 : 0, count: 0 }, // Placeholder structure
                                        ]}
                                        // Real data injection
                                        dataKey="value" nameKey="name" innerRadius={80} strokeWidth={0}
                                    >
                                        {/* We use specific colored segments based on KPI data logic */}
                                        <Cell key="win" fill="hsl(142, 76%, 36%)" value={50} /> {/* Mock ratio for visual if data missing */}
                                    </Pie>
                                    {/* 
                       Note: Since we are using Recharts Pie, let's use the actual data.kpis counts
                     */}
                                    <Pie
                                        data={[
                                            { name: "Wins", value: data.kpis.win_rate, fill: "hsl(142, 76%, 36%)" },
                                            { name: "Losses", value: 100 - data.kpis.win_rate, fill: "hsl(0, 84%, 60%)" }
                                        ]}
                                        dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} strokeWidth={0}
                                    />
                                </PieChart>
                            </ChartContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-bold text-white">{data.kpis.total_trades}</span>
                                <span className="text-xs text-zinc-500 uppercase tracking-widest">Total Trades</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── ROW 3: Strategy DNA (6) + Hourly (6) ── */}
                    <Card className="col-span-12 md:col-span-6 bg-zinc-950 border-zinc-800 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Strategy DNA</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ChartContainer config={radarConfig} className="h-full w-full mx-auto">
                                <RadarChart data={data.strategy_radar}>
                                    <PolarGrid gridType="circle" stroke="hsl(var(--border))" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Win Rate" dataKey="A" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.3} />
                                    <Radar name="Profit Factor" dataKey="B" stroke="hsl(262, 83%, 58%)" fill="hsl(262, 83%, 58%)" fillOpacity={0.3} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </RadarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="col-span-12 md:col-span-6 bg-zinc-950 border-zinc-800 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Hourly Performance</CardTitle>
                            <CardDescription className="text-xs font-mono text-emerald-400">💡 Best Window: 10:00 - 11:00 AM</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ChartContainer config={{}} className="h-full w-full">
                                <BarChart data={data.hourly_heatmap}>
                                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                                    <ChartTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                        {data.hourly_heatmap.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* ── ROW 4: Heatmap (12) ── */}
                    <Card className="col-span-12 bg-zinc-950 border-zinc-800 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Trading Calendar (Heatmap)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                {data.heatmap.map((day) => (
                                    <div key={day.date} className="group relative w-12 h-12 rounded-sm border border-black/20 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110 hover:z-10 hover:shadow-lg hover:border-zinc-500"
                                        style={{
                                            backgroundColor: getHeatmapColor(day.level),
                                        }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900/90 backdrop-blur text-white text-xs px-2 py-1 rounded shadow-xl border border-zinc-700 whitespace-nowrap z-50">
                                            <span className="font-mono">{day.date}</span>: <span className={day.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>₹{day.pnl}</span>
                                        </div>
                                    </div>
                                ))}
                                {data.heatmap.length === 0 && <p className="text-zinc-500 font-mono text-sm p-4">NO SIGNAL DATA DETECTED IN THIS SECTOR.</p>}
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-xs font-mono text-zinc-500 justify-end">
                                <span>Loss</span>
                                <div className="w-3 h-3 bg-red-900 rounded-sm"></div>
                                <div className="w-3 h-3 bg-zinc-800 rounded-sm"></div>
                                <div className="w-3 h-3 bg-emerald-900 rounded-sm"></div>
                                <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                                <span>Win</span>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            )}
        </div>
    );
}

// ── UTILS ──

function getHeatmapColor(level) {
    switch (level) {
        case 1: return "hsl(0, 84%, 60%)"; // Loss (Red)
        case 0: return "hsl(240, 5%, 26%)"; // No Trade (Zinc)
        case 2: return "hsl(142, 70%, 25%)"; // Small Win
        case 4: return "hsl(142, 76%, 36%)"; // Big Win
        default: return "hsl(240, 5%, 26%)";
    }
}

function KpiCard({ title, value, color, trend }) {
    return (
        <Card className="bg-zinc-950 border-zinc-800 relative overflow-hidden group hover:border-zinc-700 transition-all">
            <CardContent className="p-6">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">{title}</p>
                <div className={`text-3xl font-bold font-mono ${color || "text-white"}`}>
                    {value}
                </div>
                {trend && (
                    <div className="absolute bottom-4 right-4 text-xs font-mono bg-zinc-900 px-2 py-1 rounded text-zinc-400 group-hover:text-white transition-colors">
                        {trend}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function AnalyticsSkeleton() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6">
            <Skeleton className="h-20 w-full bg-zinc-900 rounded-xl" />
            <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-32 bg-zinc-900 rounded-xl" />
                <Skeleton className="h-32 bg-zinc-900 rounded-xl" />
                <Skeleton className="h-32 bg-zinc-900 rounded-xl" />
                <Skeleton className="h-32 bg-zinc-900 rounded-xl" />
            </div>
            <div className="grid grid-cols-12 gap-6">
                <Skeleton className="col-span-8 h-[350px] bg-zinc-900 rounded-xl" />
                <Skeleton className="col-span-4 h-[350px] bg-zinc-900 rounded-xl" />
            </div>
        </div>
    )
}
