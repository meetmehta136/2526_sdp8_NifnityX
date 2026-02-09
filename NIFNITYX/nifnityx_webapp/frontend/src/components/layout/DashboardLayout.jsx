import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { fetchMarketStatus, fetchDashboardStats } from "@/lib/api";
import { Wallet, Activity, ArrowUpRight } from "lucide-react";

export default function DashboardLayout({ user }) {
  const [marketData, setMarketData] = useState({ nifty: { price: 0 }, connected: false });
  const [stats, setStats] = useState({ totalPnL: 0, openTrades: 0 });

  useEffect(() => {
    const syncHUD = async () => {
      try {
        const [mRes, sRes] = await Promise.allSettled([
            fetchMarketStatus(),
            fetchDashboardStats(user?.settings?.tradingMode || 'paper')
        ]);
        if (mRes.status === 'fulfilled') setMarketData(mRes.value.data);
        if (sRes.status === 'fulfilled') setStats(sRes.value.data);
      } catch (e) { console.error("HUD Sync failed", e); }
    };
    
    syncHUD();
    const interval = setInterval(syncHUD, 60000); 
    return () => clearInterval(interval);
  }, [user]);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
        <AppSidebar user={user} />
        
        {/* Main Content Wrapper */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-background transition-all duration-300 ease-in-out">
          
          {/* Top Header / HUD */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur-md px-4 z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground md:hidden" />
              <Separator orientation="vertical" className="mr-2 h-4 bg-border md:hidden" />
              
              {/* Fixed Company Name */}
              <h2 className="font-semibold text-sm text-foreground tracking-wide hidden sm:block">
                 NifnityX
              </h2>
            </div>
            
            {/* Session HUD (Right Side) */}
            <div className="ml-auto flex items-center gap-4 md:gap-6 text-xs font-mono">
                
                {/* 1. Market Status */}
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span className="font-bold text-emerald-500 tracking-wider text-[10px]">LIVE</span>
                </div>

                <div className="hidden md:block h-4 w-[1px] bg-zinc-800" />

                {/* 2. Ticker Group */}
                <div className="flex items-center gap-4">
                    {/* NIFTY 50 */}
                    <div className="flex flex-col items-end leading-none gap-0.5">
                        <span className="text-[9px] text-zinc-500 font-bold tracking-wider uppercase">NIFTY 50</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-100 text-sm">
                                {marketData.nifty.price > 0 ? marketData.nifty.price.toLocaleString() : "..."}
                            </span>
                            <span className="flex items-center text-[10px] text-emerald-500 bg-emerald-500/10 px-1 rounded-sm">
                                <ArrowUpRight size={8} className="mr-0.5" /> 0.4%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="h-4 w-[1px] bg-zinc-800" />

                {/* 3. P&L Badge */}
                <div className="flex flex-col items-end leading-none gap-0.5">
                    <span className="text-[9px] text-zinc-500 font-bold tracking-wider uppercase">SESSION P&L</span>
                    <div className={`flex items-center gap-1.5 font-bold text-sm tracking-tight ${stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {fmt(stats.totalPnL)}
                        <Wallet className="h-3 w-3 opacity-50" />
                    </div>
                </div>

            </div>
          </header>

          {/* Page Content Outlet */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-[url('/grid-pattern.svg')] bg-fixed bg-center">
             <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}