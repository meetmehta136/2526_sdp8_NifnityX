import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateCapital, fetchAccountSummary } from "@/lib/api";
import { Wallet, TrendingUp, Activity, PieChart as PieChartIcon, RefreshCw } from "lucide-react";

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

    return (
        <div className="flex flex-col max-w-[1600px] mx-auto p-1 gap-4">
            {/* Header */}
            <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                        Account Overview
                    </h1>
                    <p className="text-zinc-400 text-xs mt-1">Manage your trading capital securely.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 h-8 text-xs">
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Quick Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <StatsCard
                        title="Net P&L"
                        value={`₹${stats.metrics.total_pnl.toLocaleString()}`}
                        icon={TrendingUp}
                        valueClass={stats.metrics.total_pnl >= 0 ? "text-emerald-500" : "text-red-500"}
                    />
                    <StatsCard
                        title="Win Rate"
                        value={`${stats.metrics.win_rate}%`}
                        icon={Activity}
                        valueClass="text-blue-400"
                    />
                    <StatsCard
                        title="Total Trades"
                        value={stats.metrics.total_trades}
                        icon={PieChartIcon}
                        valueClass="text-purple-400"
                    />
                    <StatsCard
                        title="Current Value"
                        value={`₹${stats.metrics.current_capital.toLocaleString()}`}
                        icon={Wallet}
                        valueClass="text-white"
                        sub={`Initial: ₹${stats.metrics.initial_capital.toLocaleString()}`}
                    />
                </div>
            )}

            {/* Capital Management */}
            <Card className="bg-zinc-950 border-zinc-800 shadow-lg py-0 rounded-xl">
                <CardHeader className="pt-3 px-4 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-500" /> Capital Management
                    </CardTitle>
                    <CardDescription className="text-[11px] text-zinc-500 mt-0.5">
                        Set your initial trading capital. This value is synced with the Python execution engine for position sizing.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-2">
                    <div className="flex flex-col sm:flex-row items-end gap-3 max-w-md">
                        <div className="grid w-full gap-1.5">
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Trading Capital (₹)</label>
                            <Input
                                type="number"
                                value={capitalInput}
                                onChange={(e) => setCapitalInput(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500/30 text-sm font-mono h-9 text-zinc-300"
                            />
                        </div>
                        <Button
                            onClick={handleUpdateCapital}
                            disabled={updating}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-[140px] h-9 text-xs"
                        >
                            {updating ? "Syncing..." : "Update Capital"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}

function StatsCard({ title, value, icon: Icon, valueClass, sub }) {
    return (
        <Card className="bg-zinc-950 border-zinc-800 shadow-lg py-0 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pt-3 px-4 pb-1.5">
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
