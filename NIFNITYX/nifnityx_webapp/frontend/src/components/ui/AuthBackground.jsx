import React from "react";

export default function AuthBackground({ children }) {
  return (
    <div className="relative min-h-screen w-full flex overflow-hidden bg-black">
      {/* ── Animated gradient orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* ── Grid pattern overlay ── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── LEFT PANEL — Branding ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 z-10">
        {/* Top: Logo + name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">NifnityX</span>
        </div>

        {/* Center: Hero content */}
        <div className="max-w-lg">
          <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Algorithmic
            <br />
            <span className="text-gradient">Trading Intelligence</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-10">
            AI-powered signal generation with 3-Layer evaluation, real-time execution, 
            and institutional-grade risk management for NIFTY 50 derivatives.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: "🧠", title: "3-Layer Signal Engine", desc: "Technical + Sentiment + ML scoring" },
              { icon: "⚡", title: "Real-Time Execution", desc: "Sub-second paper & live trading" },
              { icon: "🛡️", title: "Risk Management", desc: "4 strategy profiles with auto-degradation" },
              { icon: "📊", title: "Advanced Analytics", desc: "Equity curves, ML accuracy & friction analysis" },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 100 + 200}ms` }}>
                <span className="text-xl mt-0.5">{f.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">{f.title}</h3>
                  <p className="text-xs text-zinc-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Stats */}
        <div className="flex items-center gap-8">
          {[
            { value: "4", label: "Strategy Profiles" },
            { value: "3", label: "Scoring Layers" },
            { value: "<1s", label: "Signal Latency" },
          ].map((s, i) => (
            <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 100 + 600}ms` }}>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}