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
import api, { updateStrategyConfig } from "@/lib/api";

export default function StrategyTuner() {
  const [loading, setLoading] = useState(true);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);

  // Configuration State
  const [config, setConfig] = useState({
    executionMode: "manual",
    profile: "balanced"
  });

  // Fetch initial settings from User Profile
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/auth/me");
        if (data.settings) {
          setConfig({
            executionMode: data.settings.executionMode || "manual",
            profile: data.settings.strategy?.profile || "balanced"
          });
        }
      } catch (error) {
        toast.error("Failed to load strategy settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Generic Update Handler
  const handleUpdate = async (key, value) => {
    // 1. Optimistic UI Update
    const prevConfig = { ...config };
    setConfig(prev => ({ ...prev, [key]: value }));

    // 2. API Call
    try {
      await updateStrategyConfig({ [key]: value });
      toast.success("Configuration Updated");
    } catch (error) {
      setConfig(prevConfig); // Revert on error
      toast.error("Failed to save changes");
    }
  };

  // Specific Handler for Auto Mode (Safety Check)
  const handleAutoToggle = (checked) => {
    if (checked) {
      setShowAutoConfirm(true); // Open Dialog
    } else {
      handleUpdate("executionMode", "manual");
    }
  };

  const confirmAutoMode = () => {
    handleUpdate("executionMode", "auto");
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

      {/* 1. EXECUTION LOGIC (Restored & Enhanced) */}
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

      {/* 2. STRATEGY PROFILE (The Personality) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
          <BrainCircuit size={18} className="text-zinc-400" /> Strategy Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: "conservative",
              label: "Conservative",
              desc: "High win-rate focus. Waits for perfect confluence.",
              icon: Shield,
              color: "text-emerald-400",
              activeClass: "bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/20"
            },
            {
              id: "balanced",
              label: "Balanced",
              desc: "Standard approach. Equal weight on trend & reversion.",
              icon: Activity,
              color: "text-blue-400",
              activeClass: "bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/20"
            },
            {
              id: "aggressive",
              label: "Aggressive",
              desc: "High frequency. Takes trades on lower ML confidence.",
              icon: Zap,
              color: "text-amber-400",
              activeClass: "bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/20"
            },
            {
              id: "sniper",
              label: "Sniper",
              desc: "Ultra-precise. Only takes 5-star setups with high RR.",
              icon: Crosshair,
              color: "text-purple-400",
              activeClass: "bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/20"
            }
          ].map((strategy) => (
            <div
              key={strategy.id}
              onClick={() => handleUpdate("profile", strategy.id)}
              className={`
                        cursor-pointer rounded-xl border p-5 transition-all duration-200 relative group
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
                      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-lg">
                            <BrainCircuit size={20} className="text-indigo-500" />
                            How this Strategy Works
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 text-sm text-zinc-400 mt-2">
                          <h3 className="text-zinc-200 font-semibold text-base">Multi-Vector Sentiment Analysis</h3>
                          <p>
                            This algorithm operates on a high-frequency decision matrix that fuses Technical Price Action with ML-driven Sentiment Analysis.
                          </p>
                          <ul className="space-y-3 px-1">
                            <li className="flex gap-2">
                              <span className="font-bold text-zinc-200 shrink-0">1. Pattern Recognition:</span>
                              <span>Scans for institutional footprint zones (Order Blocks) and volatility contractions to identify potential breakout or reversal points.</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="font-bold text-zinc-200 shrink-0">2. Sentiment Validation:</span>
                              <span>Cross-references the technical setup against our proprietary 'Market Mood' score, derived from real-time options chain analysis and volume deltas.</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="font-bold text-zinc-200 shrink-0">3. Risk Guardrails:</span>
                              <span>Trades are only executed when the 'Confidence Score' exceeds 65%, ensuring that entry timing aligns with peak momentum to minimize drawdown.</span>
                            </li>
                          </ul>
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