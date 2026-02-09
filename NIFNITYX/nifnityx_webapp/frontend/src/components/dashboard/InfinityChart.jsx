import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import { useChartTheme } from '@/hooks/useChartTheme';
import { cn } from '@/lib/utils';

export const InfinityChart = forwardRef(({ data, className }, ref) => {
  const chartContainerRef = useRef();
  const theme = useChartTheme();
  
  // Refs
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const ohlcRef = useRef(null);
  const isFirstLoad = useRef(true); // Track first load to prevent auto-zoom reset
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  // MODERN FINTECH COLORS (Soft Emerald & Rose)
  const COLORS = {
    up: '#34d399',    // Emerald-400
    down: '#fb7185',  // Rose-400
    bg: 'transparent',
    grid: '#27272a',  // Zinc-800
    text: '#a1a1aa',  // Zinc-400
    crosshair: '#52525b', 
  };

  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const day = now.getDay();
      const isWeekday = day >= 1 && day <= 5;
      const isAfterOpen = hours > 9 || (hours === 9 && minutes >= 15);
      const isBeforeClose = hours < 15 || (hours === 15 && minutes <= 30);
      setIsMarketOpen(isWeekday && isAfterOpen && isBeforeClose);
    };
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleScreenshot = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.takeScreenshot();
      const link = document.createElement('a');
      link.download = `NIFTY50_CHART.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleResetZoom = () => {
    chartRef.current?.timeScale().fitContent();
  };

  useImperativeHandle(ref, () => ({
    updateCandle: (c) => seriesRef.current?.update(c),
    setMarkers: (m) => seriesRef.current?.setMarkers(m)
  }));

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        attributionLogo: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { visible: false },
        horzLines: { color: COLORS.grid, style: 2 },
      },
      timeScale: {
        borderColor: COLORS.grid,
        timeVisible: true,
        fixLeftEdge: true,
        borderVisible: false,
      },
      rightPriceScale: {
        borderColor: COLORS.grid,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderVisible: false,
      },
      crosshair: {
        vertLine: { color: COLORS.crosshair, width: 1, style: 3, labelBackgroundColor: '#18181b' },
        horzLine: { color: COLORS.crosshair, width: 1, style: 3, labelBackgroundColor: '#18181b' },
      },
    });

    const newSeries = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderVisible: false,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    });

    // Initial Data Load
    if (data && data.length > 0) {
      newSeries.setData(data);
      // Only fit content on the very first load
      if (isFirstLoad.current) {
          chart.timeScale().fitContent();
          isFirstLoad.current = false;
      }
    }

    chartRef.current = chart;
    seriesRef.current = newSeries;

    // OHLC Legend
    chart.subscribeCrosshairMove((param) => {
      if (!ohlcRef.current) return;
      if (param.time) {
        const d = param.seriesData.get(newSeries);
        if (d) {
          const isGreen = d.close >= d.open;
          const color = isGreen ? COLORS.up : COLORS.down; 
          const change = d.close - d.open;
          const changePct = ((change / d.open) * 100).toFixed(2);
          const sign = change >= 0 ? '+' : '';

          ohlcRef.current.innerHTML = `
            <div class="flex items-center gap-4 text-[11px] font-mono tracking-wide opacity-90 transition-all">
              <div class="flex items-baseline gap-1.5"><span class="text-zinc-500 font-semibold text-[9px] uppercase">O</span> <span style="color: ${color}">${d.open.toFixed(2)}</span></div>
              <div class="flex items-baseline gap-1.5"><span class="text-zinc-500 font-semibold text-[9px] uppercase">H</span> <span style="color: ${color}">${d.high.toFixed(2)}</span></div>
              <div class="flex items-baseline gap-1.5"><span class="text-zinc-500 font-semibold text-[9px] uppercase">L</span> <span style="color: ${color}">${d.low.toFixed(2)}</span></div>
              <div class="flex items-baseline gap-1.5"><span class="text-zinc-500 font-semibold text-[9px] uppercase">C</span> <span style="color: ${color}" class="font-bold">${d.close.toFixed(2)}</span></div>
              <div class="flex items-baseline gap-1 ml-1" style="color: ${color}">
                 <span>${sign}${change.toFixed(2)}</span>
                 <span class="opacity-75 text-[10px]">(${sign}${changePct}%)</span>
              </div>
            </div>
          `;
          return;
        }
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!chartRef.current) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chartRef.current.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, theme]);

  return (
    <div className={cn("w-full h-full bg-zinc-950 border border-zinc-800 rounded-xl relative group overflow-hidden shadow-inner flex flex-col", className)}>
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex flex-col gap-2 pointer-events-none select-none bg-gradient-to-b from-zinc-950/90 to-transparent">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            NIFTY 50 
            <span className="text-[10px] font-normal text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 rounded-sm">NSE</span>
          </h2>
          {isMarketOpen ? (
             <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
               <span className="relative flex h-1.5 w-1.5">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
               </span>
               <span className="text-[9px] font-semibold text-emerald-500 tracking-wide">LIVE</span>
             </div>
          ) : (
             <div className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2 py-0.5 rounded-full opacity-60">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
                <span className="text-[9px] font-semibold text-zinc-500 tracking-wide">CLOSED</span>
             </div>
          )}
        </div>
        <div ref={ohlcRef} className="h-4 flex items-center min-w-[200px]" />
      </div>

      <div className="absolute top-4 right-4 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-2px] group-hover:translate-y-0">
         <button onClick={handleResetZoom} className="h-8 w-8 flex items-center justify-center rounded-md bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-all shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
         </button>
         <button onClick={handleScreenshot} className="h-8 w-8 flex items-center justify-center rounded-md bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-all shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
         </button>
      </div>

      <div ref={chartContainerRef} className="w-full flex-1" />
    </div>
  );
});

export default InfinityChart;