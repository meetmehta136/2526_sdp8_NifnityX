import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { Maximize2, Camera } from 'lucide-react';

export const InfinityChart = forwardRef(({ data, interval, className }, ref) => {
    const chartContainerRef = useRef();

    // Refs
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);
    const ohlcRef = useRef(null);
    const isFirstLoad = useRef(true);
    const [isMarketOpen, setIsMarketOpen] = useState(false);

    // COLORS
    const COLORS = {
        up: '#34d399',      // Emerald-400
        down: '#fb7185',    // Rose-400
        bg: 'transparent',
        grid: '#27272a',    // Zinc-800
        text: '#a1a1aa',    // Zinc-400
        crosshair: '#52525b',
        volumeUp: 'rgba(52, 211, 153, 0.18)',
        volumeDown: 'rgba(251, 113, 133, 0.18)',
    };

    // Market status
    useEffect(() => {
        const checkMarketStatus = () => {
            const now = new Date();
            const h = now.getHours(), m = now.getMinutes(), d = now.getDay();
            const isOpen = d >= 1 && d <= 5 && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30));
            setIsMarketOpen(isOpen);
        };
        checkMarketStatus();
        const id = setInterval(checkMarketStatus, 60000);
        return () => clearInterval(id);
    }, []);

    const handleScreenshot = () => {
        if (chartRef.current) {
            const canvas = chartRef.current.takeScreenshot();
            const link = document.createElement('a');
            link.download = `NIFTY50_${interval || 'CHART'}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleAutoFit = () => {
        chartRef.current?.timeScale().fitContent();
    };

    useImperativeHandle(ref, () => ({
        updateCandle: (c) => {
            if (seriesRef.current) seriesRef.current.update(c);
            if (volumeSeriesRef.current && c.volume != null) {
                volumeSeriesRef.current.update({
                    time: c.time,
                    value: c.volume,
                    color: c.close >= c.open ? COLORS.volumeUp : COLORS.volumeDown,
                });
            }
        },
        setMarkers: (m) => seriesRef.current?.setMarkers(m),
        fitContent: handleAutoFit,
    }));

    // Chart setup
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: COLORS.bg },
                textColor: COLORS.text,
                attributionLogo: false,
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: 11,
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
                secondsVisible: false,
                fixLeftEdge: true,
                fixRightEdge: true,
                borderVisible: false,
                rightOffset: 5,
                minBarSpacing: 3,
            },
            rightPriceScale: {
                borderColor: COLORS.grid,
                scaleMargins: { top: 0.1, bottom: 0.1 },
                borderVisible: false,
                entireTextOnly: true,
                invertScale: true, // User requested INVERTED scale (Lower price at Top)
            },
            crosshair: {
                mode: 0,
                vertLine: { color: COLORS.crosshair, width: 1, style: 3, labelBackgroundColor: '#18181b' },
                horzLine: { color: COLORS.crosshair, width: 1, style: 3, labelBackgroundColor: '#18181b' },
            },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: { time: true, price: true } },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: COLORS.up,
            downColor: COLORS.down,
            borderVisible: false,
            wickUpColor: COLORS.up,
            wickDownColor: COLORS.down,
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
            borderVisible: false,
        });

        if (data && data.length > 0) {
            candleSeries.setData(data);

            const volData = data
                .filter(d => d.volume != null && d.volume > 0)
                .map(d => ({
                    time: d.time,
                    value: d.volume,
                    color: d.close >= d.open ? COLORS.volumeUp : COLORS.volumeDown,
                }));
            if (volData.length > 0) volumeSeries.setData(volData);

            if (isFirstLoad.current) {
                chart.timeScale().fitContent();
                isFirstLoad.current = false;
            }
        }

        chartRef.current = chart;
        seriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;

        chart.subscribeCrosshairMove((param) => {
            if (!ohlcRef.current) return;
            if (!param.time) {
                ohlcRef.current.innerHTML = '';
                return;
            }
            const d = param.seriesData.get(candleSeries);
            if (d) {
                const isGreen = d.close >= d.open;
                const color = isGreen ? COLORS.up : COLORS.down;
                const change = d.close - d.open;
                const changePct = ((change / d.open) * 100).toFixed(2);
                const sign = change >= 0 ? '+' : '';
                const vol = param.seriesData.get(volumeSeries);
                const volStr = vol ? formatVolume(vol.value) : '';

                ohlcRef.current.innerHTML = `
          <div class="flex items-center gap-3 text-[11px] font-mono tracking-wide opacity-90 transition-all">
             <div class="flex items-baseline gap-1"><span class="text-zinc-500 font-semibold text-[9px]">O</span> <span style="color: ${color}">${d.open.toFixed(2)}</span></div>
             <div class="flex items-baseline gap-1"><span class="text-zinc-500 font-semibold text-[9px]">H</span> <span style="color: ${color}">${d.high.toFixed(2)}</span></div>
             <div class="flex items-baseline gap-1"><span class="text-zinc-500 font-semibold text-[9px]">L</span> <span style="color: ${color}">${d.low.toFixed(2)}</span></div>
             <div class="flex items-baseline gap-1"><span class="text-zinc-500 font-semibold text-[9px]">C</span> <span style="color: ${color}" class="font-bold">${d.close.toFixed(2)}</span></div>
             <div class="flex items-baseline gap-1 ml-1" style="color: ${color}">
                <span>${sign}${change.toFixed(2)}</span>
                <span class="opacity-75 text-[10px]">(${sign}${changePct}%)</span>
             </div>
             ${volStr ? `<div class="flex items-baseline gap-1 ml-2 text-zinc-500"><span class="text-[9px]">Vol</span> <span>${volStr}</span></div>` : ''}
          </div>
        `;
            }
        });

        const ro = new ResizeObserver((entries) => {
            if (!chartRef.current) return;
            for (const e of entries) {
                chartRef.current.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
            }
        });
        ro.observe(chartContainerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
        };
    }, [data]);

    return (
        <div className={cn(
            "w-full h-full bg-zinc-950 border border-zinc-800 rounded-xl relative group overflow-hidden shadow-inner flex flex-col",
            className
        )}>
            {/* Overlay header */}
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
                <button onClick={handleAutoFit} className="h-8 px-2.5 flex items-center gap-1.5 rounded-md bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-all shadow-sm text-[10px] font-semibold">
                    <Maximize2 className="h-3.5 w-3.5" /> Auto
                </button>
                <button onClick={handleScreenshot} className="h-8 w-8 flex items-center justify-center rounded-md bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 backdrop-blur-sm transition-all shadow-sm">
                    <Camera className="h-3.5 w-3.5" />
                </button>
            </div>

            <div ref={chartContainerRef} className="w-full flex-1" />
        </div>
    );
});

function formatVolume(v) {
    if (!v) return '';
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toString();
}

export default InfinityChart;
