import React, { useState, useEffect } from "react";
import { fetchTrades } from "@/lib/api";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, CheckCircle2, XCircle, Clock, Ban, 
  Bot, Wallet, Zap, X, FileText
} from "lucide-react";

export default function TradeHistory() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState("all"); 
  const [sourceFilter, setSourceFilter] = useState("all"); 
  const [execFilter, setExecFilter] = useState("all"); 
  const [searchQuery, setSearchQuery] = useState("");

  const loadTrades = async () => {
    setLoading(true);
    try {
      // Fetch Real Data Only
      const res = await fetchTrades({ limit: 100 });
      if (res.data && Array.isArray(res.data)) {
        setTrades(res.data);
      } else {
        setTrades([]);
      }
    } catch (error) {
      console.error("Failed to load trades", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  // --- FILTERING LOGIC ---
  const filteredTrades = trades.filter(trade => {
    const matchesSearch = 
      (trade.symbol || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (trade.trade_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (trade.setup_name || "").toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTab = true;
    if (activeTab === "live") matchesTab = trade.status === "OPEN";
    else if (activeTab === "history") matchesTab = ["WIN", "LOSS", "CLOSED"].includes(trade.status);
    else if (activeTab === "logs") matchesTab = ["REJECTED", "PENDING_APPROVAL", "CANCELLED", "EXPIRED"].includes(trade.status);

    let matchesSource = true;
    if (sourceFilter === "live") matchesSource = trade.is_paper === false;
    if (sourceFilter === "paper") matchesSource = trade.is_paper === true;

    let matchesExec = true;
    if (execFilter === "auto") matchesExec = trade.execution_mode === "AUTO";
    if (execFilter === "manual") matchesExec = trade.execution_mode === "MANUAL";

    return matchesSearch && matchesTab && matchesSource && matchesExec;
  });

  const clearFilters = () => {
    setActiveTab('all');
    setSourceFilter('all');
    setExecFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = activeTab !== 'all' || sourceFilter !== 'all' || execFilter !== 'all' || searchQuery !== '';

  const StatusBadge = ({ status }) => {
    const config = {
      WIN: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
      LOSS: { color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
      OPEN: { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Clock },
      REJECTED: { color: "text-zinc-500 bg-zinc-900 border-zinc-700", icon: Ban },
      EXPIRED: { color: "text-zinc-500 bg-zinc-900 border-zinc-700", icon: Ban },
      PENDING_APPROVAL: { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Zap },
    };
    const style = config[status] || config.REJECTED;
    const Icon = style.icon;

    return (
      <Badge variant="outline" className={`${style.color} border px-2 py-0.5 text-[10px] uppercase font-bold flex w-fit items-center gap-1.5`}>
        <Icon size={12} /> {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] max-w-[1600px] mx-auto p-1 gap-4">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            Trade History
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono font-normal text-xs">
              {filteredTrades.length} Records
            </Badge>
          </h1>
          <p className="text-zinc-400 text-xs mt-1">Audit log of all algorithmic executions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTrades} className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 h-8 text-xs">
          Refresh Data
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex-none flex flex-col xl:flex-row gap-3 items-start xl:items-center justify-between bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
        <Tabs value={activeTab} className="w-full xl:w-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-950 border border-zinc-800 h-8 p-0.5">
            <TabsTrigger value="all" className="text-[11px] px-3 data-[state=active]:bg-zinc-800 text-zinc-500">All</TabsTrigger>
            <TabsTrigger value="live" className="text-[11px] px-3 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-zinc-500">Live</TabsTrigger>
            <TabsTrigger value="history" className="text-[11px] px-3 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-zinc-500">Closed</TabsTrigger>
            <TabsTrigger value="logs" className="text-[11px] px-3 data-[state=active]:bg-zinc-800 text-zinc-500">Logs</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto items-center">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-600" />
            <Input 
              placeholder="Search Symbol, ID..." 
              className="pl-8 bg-zinc-950 border-zinc-800 text-xs h-8 focus-visible:ring-indigo-500/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-300">
              <div className="flex items-center gap-2"><Wallet size={12} className="text-zinc-500"/><SelectValue placeholder="Source" /></div>
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs">
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="live">Real Money</SelectItem>
              <SelectItem value="paper">Paper Trading</SelectItem>
            </SelectContent>
          </Select>

          <Select value={execFilter} onValueChange={setExecFilter}>
             <SelectTrigger className="w-full sm:w-[130px] h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-300">
              <div className="flex items-center gap-2"><Bot size={12} className="text-zinc-500"/><SelectValue placeholder="Execution" /></div>
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs">
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="auto">Automated</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <Card className="flex-1 bg-zinc-950 py-0 border-zinc-800 shadow-lg overflow-hidden flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 overflow-hidden h-full relative">
          <div className="absolute inset-0 overflow-auto">
            <table className="w-full text-sm text-left caption-bottom">
              <TableHeader className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800 shadow-sm">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="w-[160px] text-zinc-400 font-medium pl-6 py-3 bg-zinc-950">Time</TableHead>
                  <TableHead className="text-zinc-400 font-medium bg-zinc-950">Symbol</TableHead>
                  <TableHead className="text-zinc-400 font-medium bg-zinc-950">Type</TableHead>
                  <TableHead className="text-zinc-400 font-medium bg-zinc-950">Status</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-right bg-zinc-950">Entry / Exit</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-right pr-6 bg-zinc-950">P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   <TableRow><TableCell colSpan={6} className="h-48 text-center text-zinc-500">Loading...</TableCell></TableRow>
                ) : filteredTrades.length === 0 ? (
                   <TableRow><TableCell colSpan={6} className="h-64 text-center text-zinc-500">No trades found in system.</TableCell></TableRow>
                ) : (
                  filteredTrades.map((trade) => (
                    <TableRow key={trade._id} className="border-b border-zinc-800/40 hover:bg-zinc-900/40 transition-colors group">
                      <TableCell className="pl-6 py-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs text-zinc-300">
                            {trade.entry?.time ? new Date(trade.entry.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '--'}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-600">
                             {trade.entry?.time ? new Date(trade.entry.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm text-zinc-200">{trade.symbol}</span>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-zinc-500 bg-zinc-900/50 border border-zinc-800/50 px-1.5 rounded-sm">{trade.setup_name}</span>
                             <span className="text-[10px] text-zinc-600 font-mono">{trade.lots} Lot{trade.lots > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3">
                         <div className="flex gap-2">
                            {trade.is_paper ? 
                              <Badge variant="secondary" className="bg-indigo-500/5 text-indigo-400/80 border-indigo-500/10 text-[9px] h-5 px-1.5"><FileText size={9} className="mr-1"/> PAPER</Badge> : 
                              <Badge variant="secondary" className="bg-amber-500/5 text-amber-400/80 border-amber-500/10 text-[9px] h-5 px-1.5"><Zap size={9} className="mr-1"/> REAL</Badge>
                            }
                         </div>
                      </TableCell>
                      <TableCell className="align-top py-3"><StatusBadge status={trade.status} /></TableCell>
                      <TableCell className="text-right align-top py-3">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-mono text-xs text-zinc-300">{trade.entry?.price?.toFixed(2)}</span>
                          {trade.exit?.price ? 
                            <span className="font-mono text-[10px] text-zinc-600">{trade.exit.price.toFixed(2)}</span> : 
                            <span className="text-[10px] text-blue-400/80 animate-pulse font-medium">Active</span>
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 align-top py-3">
                        {['WIN', 'LOSS'].includes(trade.status) ? (
                           <div className="flex flex-col items-end gap-0.5">
                              <span className={`font-bold font-mono text-sm ${trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trade.pnl > 0 ? '+' : ''}{trade.pnl?.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-zinc-700 font-medium">Score: {trade.confidence_score?.total}/{trade.confidence_score?.max || 100}</span>
                           </div>
                        ) : <span className="text-zinc-800 font-mono text-sm">-</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}