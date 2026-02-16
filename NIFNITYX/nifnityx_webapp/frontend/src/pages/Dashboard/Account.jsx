import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateCapital, fetchAccountSummary } from "@/lib/api";
import { Wallet, TrendingUp, Activity, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, Pie, PieChart as RePieChart, Cell, Label } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export default function Account() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [capitalInput, setCapitalInput] = useState("");
    const [updating, setUpdating] = useState(false);

    const loadData = async () => {
        try {
            const { data } = await fetchAccountSummary();
            setStats(data);
            if (data.metrics.initial_capital) {
                setCapitalInput(data.metrics.initial_capital);
            }
        } catch (error) {
            toast.error("Failed to load account data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdateCapital = async () => {
        if (!capitalInput || isNaN(capitalInput)) return toast.error("Invalid capital amount");
        setUpdating(true);
        try {
            await updateCapital(Number(capitalInput));
            toast.success("Capital updated & synced with Trading Engine");
            loadData(); // Refresh to ensure sync
        } catch (error) {
            toast.error("Failed to update capital");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center text-zinc-500 animate-pulse">Loading Account Overview...</div>;

    // Chart Config for ShadCN
    const equityChartConfig = {
        value: {
            label: "Account Value",
            color: "hsl(var(--primary))",
        },
    };

    const winLossConfig = {
        Win: {
            label: "Wins",
            color: "hsl(142, 76%, 36%)", // emerald-600
        },
        Loss: {
            label: "Losses",
            color: "hsl(0, 84%, 60%)", // red-500
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Account Overview</h1>

            {/* SECTION A: Capital Management */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader className="pb-3 bg-zinc-900/40 border-b border-zinc-800/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-500" /> Capital Management
                    </CardTitle>
                    <CardDescription>Set your initial trading capital. This value is synced with the Python execution engine for position sizing.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex items-end gap-4 max-w-md">
                        <div className="grid w-full gap-2">
                            <label className="text-xs font-semibold text-zinc-400">Trading Capital (₹)</label>
                            <Input
                                type="number"
                                value={capitalInput}
                                onChange={(e) => setCapitalInput(e.target.value)}
                                className="bg-zinc-900 border-zinc-700 focus-visible:ring-emerald-500 text-lg font-mono"
                            />
                        </div>
                        <Button onClick={handleUpdateCapital} disabled={updating} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]">
                            {updating ? "Syncing..." : "Update Capital"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION B: Quick Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Net P&L"
                        value={`₹${stats.metrics.total_pnl.toLocaleString()}`}
                        icon={TrendingUp}
                        className={stats.metrics.total_pnl >= 0 ? "text-emerald-500" : "text-red-500"}
                    />
                    <StatsCard title="Win Rate" value={`${stats.metrics.win_rate}%`} icon={Activity} className="text-blue-400" />
                    <StatsCard title="Total Trades" value={stats.metrics.total_trades} icon={PieChartIcon} className="text-purple-400" />
                    <StatsCard title="Current Value" value={`₹${stats.metrics.current_capital.toLocaleString()}`} icon={Wallet}
                        subtext={`Initial: ₹${stats.metrics.initial_capital.toLocaleString()}`}
                        className="text-white"
                    />
                </div>
            )}

            {/* SECTION C: Charts */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Chart 1: Equity Curve (Area) - Takes 2 cols */}
                    <Card className="lg:col-span-2 bg-zinc-950 border-zinc-800 flex flex-col">
                        <CardHeader>
                            <CardTitle>Equity Growth</CardTitle>
                            <CardDescription>Account value progression over time</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px]">
                            <ChartContainer config={equityChartConfig} className="h-full w-full max-h-[350px]">
                                <AreaChart data={stats.charts.equity_curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        minTickGap={32}
                                        tickFormatter={(value) => {
                                            const date = new Date(value);
                                            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                        }}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="hsl(var(--primary))"
                                        fill="url(#fillValue)"
                                        fillOpacity={0.4}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Chart 2: Win/Loss (Donut) - Takes 1 col */}
                    <Card className="bg-zinc-950 border-zinc-800 flex flex-col">
                        <CardHeader>
                            <CardTitle>Win/Loss Ratio</CardTitle>
                            <CardDescription>Trade outcome distribution</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 pb-0">
                            <ChartContainer config={winLossConfig} className="mx-auto aspect-square max-h-[250px]">
                                <RePieChart>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Pie
                                        data={stats.charts.win_loss_distribution}
                                        dataKey="count"
                                        nameKey="status"
                                        innerRadius={60}
                                        strokeWidth={5}
                                    >
                                        {stats.charts.win_loss_distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={winLossConfig[entry.status]?.color || "gray"} />
                                        ))}
                                        <Label
                                            content={({ viewBox }) => {
                                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                    return (
                                                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                                                {stats.metrics.total_trades.toLocaleString()}
                                                            </tspan>
                                                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                                                                Trades
                                                            </tspan>
                                                        </text>
                                                    )
                                                }
                                            }}
                                        />
                                    </Pie>
                                </RePieChart>
                            </ChartContainer>
                        </CardContent>
                        <div className="p-4 pt-0 flex justify-center gap-4 text-sm mt-4 pb-8">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: winLossConfig.Win.color }}></div> Win ({stats.charts.win_loss_distribution.find(d => d.status === "Win")?.count || 0})
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: winLossConfig.Loss.color }}></div> Loss ({stats.charts.win_loss_distribution.find(d => d.status === "Loss")?.count || 0})
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, className, subtext }) {
    return (
        <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                <Icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${className || "text-white"}`}>
                    {value}
                </div>
                {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
            </CardContent>
        </Card>
    )
}
