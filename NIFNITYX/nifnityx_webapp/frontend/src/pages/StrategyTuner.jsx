import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Zap, Shield, Crosshair, Activity, Bot, Info, BrainCircuit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api, { updateStrategyConfig, setActiveStrategy, fetchActiveStrategy } from "@/lib/api";

// ── Strategy definitions sourced from Meet's Python trading_strategies/ ──
const STRATEGIES = [
  {
    id: "sniper",
    label: "Sniper",
    desc: "Only takes 5-star setups. Lowest trade frequency, highest quality filter.",
    icon: Crosshair,
    color: "text-purple-400",
    activeClass: "bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/20",
    details: {
      title: "Sniper Strategy",
      subtitle: "Precision over frequency — the original 3-Layer system behaviour.",
      params: [
        { label: "Min Score", value: "60 / 120" },
        { label: "ML Block", value: "< 15 / 40" },
        { label: "ML Strong", value: "≥ 22 / 40" },
        { label: "Max Positions", value: "2 simultaneous" },
        { label: "Max Daily Trades", value: "8" },
        { label: "Daily Drawdown Cap", value: "2.5%" },
      ],
      lotTiers: [
        { range: "ML < 15", lots: "0.5 lots", note: "Minimum allocation" },
        { range: "ML 15–21", lots: "0.75 lots", note: "Standard" },
        { range: "ML ≥ 22", lots: "1.25 lots", note: "High conviction" },
      ],
      riskGates: [
        "Hard blocks on: max positions, daily trade count, and 2.5% intraday drawdown.",
        "ML scores below 15 are blocked entirely — no exceptions.",
        "Disaster flag (extreme news events) halts all entries.",
      ],
      verdict: "Best for: Patient traders who want fewer, higher-quality entries with tight risk control.",
    },
  },
  {
    id: "balanced",
    label: "Balanced",
    desc: "Steady approach with loss-streak protection. Reduces lot size after 2 daily losses.",
    icon: Activity,
    color: "text-blue-400",
    activeClass: "bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/20",
    details: {
      title: "Balanced Strategy",
      subtitle: "Consistent trading with built-in capital protection on losing streaks.",
      params: [
        { label: "Min Score", value: "65 / 120" },
        { label: "ML Block", value: "< 18 / 40" },
        { label: "ML Medium", value: "≥ 25 / 40" },
        { label: "Max Positions", value: "2 simultaneous" },
        { label: "Max Daily Trades", value: "3" },
        { label: "Daily Drawdown Cap", value: "2.0%" },
      ],
      lotTiers: [
        { range: "ML < 18", lots: "0.75 lots", note: "Cautious" },
        { range: "ML 18–24", lots: "1.0 lots", note: "Standard" },
        { range: "ML ≥ 25", lots: "1.25 lots", note: "Confident" },
      ],
      riskGates: [
        "After 2 losses in the same day, lot size is reduced by 0.25 (floor: 0.5).",
        "Hard blocks at 2.0% daily drawdown, 2 open positions, or 3 daily trades.",
        "ML below 18 is rejected — slightly higher bar than Sniper.",
      ],
      verdict: "Best for: Normal market conditions. Protects capital during losing streaks without shutting down entirely.",
    },
  },
  {
    id: "aggressive",
    label: "Aggressive",
    desc: "High frequency with auto-degradation. Falls back to Balanced thresholds if drawdown exceeds 3%.",
    icon: Zap,
    color: "text-amber-400",
    activeClass: "bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/20",
    details: {
      title: "Aggressive Strategy",
      subtitle: "Maximum trade frequency with a built-in circuit breaker.",
      params: [
        { label: "Min Score (Normal)", value: "55 / 120" },
        { label: "Min Score (Degraded)", value: "65 / 120" },
        { label: "ML Block (Normal)", value: "< 12 / 40" },
        { label: "ML Block (Degraded)", value: "< 18 / 40" },
        { label: "Max Positions", value: "4 simultaneous" },
        { label: "Max Daily Trades", value: "6" },
        { label: "Hard DD Stop", value: "3.5%" },
        { label: "Degraded Trigger", value: "3.0% DD" },
      ],
      lotTiers: [
        { range: "ML < 12", lots: "1.0 lots", note: "Normal mode" },
        { range: "ML 12–21", lots: "1.25 lots", note: "Normal mode" },
        { range: "ML ≥ 22", lots: "1.5 lots", note: "Maximum sizing" },
      ],
      riskGates: [
        "When daily drawdown exceeds 3%, the strategy switches to Balanced thresholds for the rest of the session.",
        "In degraded mode: ML block rises to 18, min score rises to 65, and lot sizing drops to Balanced tiers (0.75 / 1.0 / 1.25).",
        "Hard stop at 3.5% daily drawdown — no more trades regardless of mode.",
      ],
      verdict: "Best for: High-volatility trending days. The degradation acts as self-healing — a bad morning won't become a catastrophic day.",
    },
  },
  {
    id: "conservative",
    label: "Conservative",
    desc: "Maximum protection. Trades only 10:00–14:30 IST and locks out after 2 losses.",
    icon: Shield,
    color: "text-emerald-400",
    activeClass: "bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/20",
    details: {
      title: "Conservative Strategy",
      subtitle: "Capital preservation first — only trades during the safest market hours.",
      params: [
        { label: "Min Score", value: "70 / 120" },
        { label: "ML Block", value: "< 22 / 40" },
        { label: "ML Strong", value: "≥ 28 / 40" },
        { label: "Max Positions", value: "1 (single focus)" },
        { label: "Max Daily Trades", value: "2" },
        { label: "Daily Drawdown Cap", value: "1.5%" },
        { label: "Trading Window", value: "10:00 – 14:30 IST" },
        { label: "Loss Lockout", value: "After 2 losses" },
      ],
      lotTiers: [
        { range: "ML < 22", lots: "0.5 lots", note: "Minimum" },
        { range: "ML 22–27", lots: "0.75 lots", note: "Standard" },
        { range: "ML ≥ 28", lots: "1.0 lots", note: "Max allocation" },
      ],
      riskGates: [
        "Avoids the 9:15–10:00 gap-fill phase and 14:30–15:30 expiry/repo spike zone.",
        "After 2 consecutive daily losses, trading halts for the rest of the day. Resets every morning.",
        "Only 1 position at a time — never stacks exposure. Max 2 trades per day.",
        "Lot size capped at 1.0 — never sizes aggressively, even on high ML.",
      ],
      verdict: "Best for: Cautious traders. Highest ML bar (22/40), tightest drawdown cap (1.5%), and a professional 'know when to walk away' lockout.",
    },
  },
];

export default function StrategyTuner() {
  const [loading, setLoading] = useState(true);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Configuration State
  const [config, setConfig] = useState({
    executionMode: "manual",
    profile: "sniper"
  });

  // Fetch initial settings from User Profile + active strategy
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [userRes, stratRes] = await Promise.allSettled([
          api.get("/auth/me"),
          fetchActiveStrategy(),
        ]);

        let profile = "sniper";

        if (userRes.status === "fulfilled" && userRes.value.data.settings) {
          const settings = userRes.value.data.settings;
          setConfig(prev => ({
            ...prev,
            executionMode: settings.executionMode || "manual",
            profile: settings.strategy?.profile || "sniper",
          }));
          profile = settings.strategy?.profile || "sniper";
        }

        // Use the active strategy from backend if available (takes precedence)
        if (stratRes.status === "fulfilled" && stratRes.value.data.active) {
          profile = stratRes.value.data.active;
          setConfig(prev => ({ ...prev, profile }));
        }
      } catch (error) {
        toast.error("Failed to load strategy settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Handle strategy profile change
  const handleProfileChange = async (newProfile) => {
    if (newProfile === config.profile) return;
    const prev = config.profile;
    setConfig(c => ({ ...c, profile: newProfile }));
    setSwitching(true);

    try {
      // Update user settings + hot-swap Python sequentially to prevent MongoDB lock/version conflicts
      await updateStrategyConfig({ profile: newProfile });
      await setActiveStrategy(newProfile);
      toast.success(`Strategy switched to ${newProfile.toUpperCase()}`);
    } catch (error) {
      setConfig(c => ({ ...c, profile: prev }));
      toast.error("Failed to switch strategy");
    } finally {
      setSwitching(false);
    }
  };

  // Handle execution mode change (not strategy)
  const handleModeUpdate = async (key, value) => {
    const prevConfig = { ...config };
    setConfig(prev => ({ ...prev, [key]: value }));

    try {
      await updateStrategyConfig({ [key]: value });
      toast.success("Configuration Updated");
    } catch (error) {
      setConfig(prevConfig);
      toast.error("Failed to save changes");
    }
  };

  // Specific Handler for Auto Mode (Safety Check)
  const handleAutoToggle = (checked) => {
    if (checked) {
      setShowAutoConfirm(true);
    } else {
      handleModeUpdate("executionMode", "manual");
    }
  };

  const confirmAutoMode = () => {
    handleModeUpdate("executionMode", "auto");
    setShowAutoConfirm(false);
  };

  if (loading) return <div className="flex h-full items-center justify-center text-zinc-500 animate-pulse">Loading Engine Config...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 p-1">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
          Strategy Tuner
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Configure algorithmic behavior, risk parameters, and execution safeguards.
        </p>
      </div>

      {/* 1. EXECUTION LOGIC */}
      <Card className={`border transition-all duration-500 ${config.executionMode === 'auto' ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-zinc-950 border-zinc-800'}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-full transition-colors ${config.executionMode === 'auto' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {config.executionMode === 'auto' ? <Zap size={20} fill="currentColor" /> : <Bot size={20} />}
            </div>
            <div>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${config.executionMode === 'auto' ? 'text-emerald-400' : 'text-zinc-100'}`}>
                {config.executionMode === 'auto' ? "AI PILOT ACTIVE" : "MANUAL OVERSIGHT"}
                {config.executionMode === 'auto' && (
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-lg">
                {config.executionMode === 'auto'
                  ? "Bot executes orders instantly upon signal generation (Slippage < 0.5%)."
                  : "Bot waits for your manual confirmation before placing orders."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="auto-mode" className={`text-xs font-medium ${config.executionMode === 'auto' ? 'text-emerald-500' : 'text-zinc-400'}`}>
              {config.executionMode === 'auto' ? "AUTO ENGAGED" : "Auto Mode"}
            </Label>
            <Switch
              id="auto-mode"
              checked={config.executionMode === 'auto'}
              onCheckedChange={handleAutoToggle}
              className={`
                 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700
                 ${config.executionMode === 'auto' ? "shadow-[0_0_10px_rgba(16,185,129,0.4)]" : ""}
              `}
            />
          </div>
        </div>
      </Card>

      {/* 2. STRATEGY PROFILE */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
          <BrainCircuit size={18} className="text-zinc-400" /> Strategy Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STRATEGIES.map((strategy) => (
            <div
              key={strategy.id}
              onClick={() => !switching && handleProfileChange(strategy.id)}
              className={`
                cursor-pointer rounded-xl border p-5 transition-all duration-200 relative group
                ${switching ? "opacity-60 pointer-events-none" : ""}
                ${config.profile === strategy.id ? strategy.activeClass : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700"}
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg bg-black/40 border border-zinc-800/50 ${strategy.color}`}>
                  <strategy.icon size={20} />
                </div>
                <div className="flex items-center gap-2">
                  {/* INFO BUTTON WITH DIALOG */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        >
                          <Info size={14} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2.5 text-base">
                            <div className={`p-1.5 rounded-md bg-black/40 border border-zinc-800/50 ${strategy.color}`}>
                              <strategy.icon size={16} />
                            </div>
                            {strategy.details.title}
                          </DialogTitle>
                          <DialogDescription className="text-zinc-400 text-xs mt-1">
                            {strategy.details.subtitle}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5 mt-3">
                          {/* Parameters Table */}
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Parameters</h4>
                            <div className="rounded-lg border border-zinc-800/60 overflow-hidden">
                              {strategy.details.params.map((p, i) => (
                                <div key={i} className={`flex justify-between px-3 py-2 text-xs ${i % 2 === 0 ? "bg-zinc-900/30" : "bg-zinc-900/10"}`}>
                                  <span className="text-zinc-400">{p.label}</span>
                                  <span className="text-zinc-200 font-mono font-medium">{p.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Lot Sizing */}
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">ML-Based Lot Sizing</h4>
                            <div className="space-y-1.5">
                              {strategy.details.lotTiers.map((tier, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900/30 text-xs">
                                  <span className="text-zinc-500 font-mono w-20 shrink-0">{tier.range}</span>
                                  <span className={`font-semibold ${strategy.color}`}>{tier.lots}</span>
                                  <span className="text-zinc-500 ml-auto">{tier.note}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Risk Gates */}
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Risk Gates</h4>
                            <ul className="space-y-2">
                              {strategy.details.riskGates.map((gate, i) => (
                                <li key={i} className="flex gap-2 text-xs text-zinc-400 leading-relaxed">
                                  <span className="text-zinc-600 mt-0.5 shrink-0">•</span>
                                  <span>{gate}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Verdict */}
                          <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 px-3 py-2.5">
                            <p className="text-xs text-zinc-300 leading-relaxed">{strategy.details.verdict}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {config.profile === strategy.id && (
                    <div className={`h-2 w-2 rounded-full ${strategy.color.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`} />
                  )}
                </div>
              </div>
              <h3 className={`font-bold text-sm mb-1.5 ${config.profile === strategy.id ? "text-white" : "text-zinc-300"}`}>
                {strategy.label}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                {strategy.desc}
              </p>
            </div>
          ))}
        </div>
      </div>



      {/* Safety Confirmation Dialog */}
      <AlertDialog open={showAutoConfirm} onOpenChange={setShowAutoConfirm}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Shield className="text-red-500" /> Enable Automated Execution?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will allow the bot to place orders on your broker account <strong>instantly</strong> without your manual confirmation.
              <br /><br />
              Ensure you have sufficient margin and have tested the strategy in Paper Mode first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoMode} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Yes, Enable Auto-Trade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}