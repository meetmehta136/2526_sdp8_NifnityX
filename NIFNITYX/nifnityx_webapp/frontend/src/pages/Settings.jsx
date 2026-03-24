import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings2, Save, RotateCcw, Wallet, Shield, Cpu, Bell, Info } from "lucide-react";

const DEFAULT_SETTINGS = {
  // Capital Management
  initialCapital: 100000,
  maxPositionSize: 2,
  maxDailyLoss: 3,
  // Risk Controls
  maxLotsPerTrade: 2,
  stopLossBuffer: 0.5,
  targetMultiplier: 2,
  // Simulation Config
  csvDataPath: "data/NIFTY_1MIN_2025.csv",
  demoPause: 20,
  filterDays: 0,
  // Notifications
  soundAlerts: true,
  browserNotifications: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("nifnityx_settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [hasChanges, setHasChanges] = useState(false);

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem("nifnityx_settings", JSON.stringify(settings));
    setHasChanges(false);
    toast.success("Settings saved to localStorage");
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem("nifnityx_settings");
    setHasChanges(false);
    toast.success("Settings reset to defaults");
  };

  // Generate demo command from current settings
  const demoCommand = `python simulation_paper_trading.py --strategy balanced${settings.filterDays === 0 ? " --no-filter" : ""} --pause ${settings.demoPause}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            Settings
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Configure trading parameters. Changes are saved to localStorage. Update{" "}
            <code className="text-indigo-400 bg-zinc-900 px-1.5 py-0.5 rounded text-[11px] font-mono">config.py</code>{" "}
            for Python-side changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}
            className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 h-8 text-xs">
            <RotateCcw className="w-3 h-3 mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}
            className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-xs disabled:opacity-50">
            <Save className="w-3 h-3 mr-1.5" /> Save
          </Button>
        </div>
      </div>

      {/* ═══ CAPITAL MANAGEMENT ═══ */}
      <SettingsSection icon={Wallet} title="CAPITAL MANAGEMENT" iconColor="text-emerald-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SettingsField label="Initial Capital (₹)" value={settings.initialCapital}
            onChange={(v) => update("initialCapital", Number(v))} type="number" />
          <SettingsField label="Max Position Size (lots)" value={settings.maxPositionSize}
            onChange={(v) => update("maxPositionSize", Number(v))} type="number" />
          <SettingsField label="Max Daily Loss %" value={settings.maxDailyLoss}
            onChange={(v) => update("maxDailyLoss", Number(v))} type="number" />
        </div>
      </SettingsSection>

      {/* ═══ RISK CONTROLS ═══ */}
      <SettingsSection icon={Shield} title="RISK CONTROLS" iconColor="text-blue-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SettingsField label="Max Lots per Trade" value={settings.maxLotsPerTrade}
            onChange={(v) => update("maxLotsPerTrade", Number(v))} type="number" />
          <SettingsField label="Stop Loss Buffer %" value={settings.stopLossBuffer}
            onChange={(v) => update("stopLossBuffer", Number(v))} type="number" step="0.1" />
          <SettingsField label="Target Multiplier" value={settings.targetMultiplier}
            onChange={(v) => update("targetMultiplier", Number(v))} type="number" />
        </div>
      </SettingsSection>

      {/* ═══ SIMULATION CONFIG ═══ */}
      <SettingsSection icon={Cpu} title="SIMULATION CONFIG" iconColor="text-purple-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SettingsField label="CSV Data Path" value={settings.csvDataPath}
            onChange={(v) => update("csvDataPath", v)} type="text" />
          <SettingsField label="Demo Pause (seconds)" value={settings.demoPause}
            onChange={(v) => update("demoPause", Number(v))} type="number" />
          <SettingsField label="Filter Days (0 = all)" value={settings.filterDays}
            onChange={(v) => update("filterDays", Number(v))} type="number" />
        </div>
      </SettingsSection>

      {/* ═══ NOTIFICATIONS ═══ */}
      <SettingsSection icon={Bell} title="NOTIFICATIONS" iconColor="text-amber-500">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-zinc-200 font-semibold">Sound Alerts</Label>
              <p className="text-[11px] text-zinc-500 mt-0.5">Play sound on new signals and trade closures</p>
            </div>
            <Switch
              checked={settings.soundAlerts}
              onCheckedChange={(v) => update("soundAlerts", v)}
              className="data-[state=checked]:bg-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-zinc-200 font-semibold">Browser Notifications</Label>
              <p className="text-[11px] text-zinc-500 mt-0.5">Show native browser notifications for important events</p>
            </div>
            <Switch
              checked={settings.browserNotifications}
              onCheckedChange={(v) => update("browserNotifications", v)}
              className="data-[state=checked]:bg-indigo-500"
            />
          </div>
        </div>
      </SettingsSection>

      {/* ═══ INFO NOTE ═══ */}
      <Card className="bg-zinc-900/30 border-zinc-800/50 rounded-xl py-0">
        <CardContent className="px-5 py-4 space-y-3 text-xs text-zinc-400">
          <p>
            <span className="text-amber-400 font-bold">Note:</span>{" "}
            These settings are stored in your browser's localStorage. For Python-side changes (like capital or CSV path), also update{" "}
            <code className="text-indigo-400 bg-zinc-900 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold">NIFNITYX/config.py</code>{" "}
            and restart the simulation.
          </p>
          <p className="text-zinc-500">
            <span className="text-zinc-400 font-semibold">Demo command:</span>{" "}
            <code className="text-emerald-400 bg-zinc-950 px-2 py-1 rounded font-mono text-[11px] block mt-1.5 border border-zinc-800/50">
              {demoCommand}
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reusable Section Component ──
function SettingsSection({ icon: Icon, title, iconColor, children }) {
  return (
    <Card className="bg-zinc-950 border-zinc-800 shadow-lg rounded-xl py-0">
      <CardHeader className="pt-4 px-5 pb-2">
        <CardTitle className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

// ── Reusable Field Component ──
function SettingsField({ label, value, onChange, type = "text", step }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
      <Input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900/60 border-zinc-800/60 text-sm font-mono h-10 text-zinc-200 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 rounded-lg"
      />
    </div>
  );
}
