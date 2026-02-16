import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ═══════════════════════════════════════════════════════════
// FREE Market Data Service — No API Key Required!
// Uses Yahoo Finance for NIFTY 50 chart data.
// User's Angel One key is ONLY used for wallet/orders.
// ═══════════════════════════════════════════════════════════

// In-memory cache: { key: { data, timestamp } }
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Yahoo Finance interval mapping
const INTERVAL_MAP = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1d": "1d",
};

// Period mapping (how far back to fetch)
const PERIOD_MAP = {
    "1m": "7d",   // Yahoo allows 1m data for last 7 days only
    "5m": "60d",
    "15m": "60d",
    "1d": "1y",
};

// Symbol mapping for Indian markets
const SYMBOL_MAP = {
    "NIFTY": "^NSEI",
    "NIFTY50": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
};

/**
 * Fetch NIFTY/market chart data from Yahoo Finance (FREE)
 * @param {string} symbol - "NIFTY", "BANKNIFTY", or Yahoo symbol
 * @param {string} interval - "1m", "5m", "15m", "1d"
 * @returns {Array} - [{ time, open, high, low, close, volume }, ...]
 */
export async function getChartData(symbol = "NIFTY", interval = "1m") {
    // 1. Resolve symbol
    const yahooSymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol;
    const yahooInterval = INTERVAL_MAP[interval] || "1m";
    const period = PERIOD_MAP[interval] || "7d";

    // 2. Check cache
    const cacheKey = `${yahooSymbol}_${yahooInterval}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`♻️  Cache hit: ${cacheKey} (${cached.data.length} candles)`);
        return cached.data;
    }

    // 3. Fetch from Yahoo Finance
    console.log(`📊 Fetching ${yahooSymbol} @ ${yahooInterval} (period: ${period})`);

    try {
        const result = await yahooFinance.chart(yahooSymbol, {
            period1: getStartDate(period),
            interval: yahooInterval,
        });

        if (!result || !result.quotes || result.quotes.length === 0) {
            console.warn("⚠️ No chart data from Yahoo Finance");
            return [];
        }

        // 4. Transform to Lightweight Charts format
        const chartData = result.quotes
            .filter(q => q.open != null && q.close != null && q.high != null && q.low != null)
            .map(q => ({
                time: Math.floor(new Date(q.date).getTime() / 1000),
                open: roundPrice(q.open),
                high: roundPrice(q.high),
                low: roundPrice(q.low),
                close: roundPrice(q.close),
                volume: q.volume || 0,
            }));

        // Sort ascending by time
        chartData.sort((a, b) => a.time - b.time);

        // 5. Cache it
        cache.set(cacheKey, { data: chartData, timestamp: Date.now() });
        console.log(`✅ Cached ${chartData.length} candles for ${cacheKey}`);

        return chartData;

    } catch (error) {
        console.error("❌ Yahoo Finance Fetch Error:", error.message);
        // Return cached data even if stale, better than nothing
        if (cached) {
            console.log("♻️  Returning stale cache as fallback");
            return cached.data;
        }
        return [];
    }
}

/**
 * Get current price summary for header display
 */
export async function getPriceSummary(symbol = "NIFTY") {
    const yahooSymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol;

    const cacheKey = `summary_${yahooSymbol}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }

    try {
        const result = await yahooFinance.quote(yahooSymbol);

        const summary = {
            symbol: symbol,
            price: roundPrice(result.regularMarketPrice),
            change: roundPrice(result.regularMarketChange),
            changePercent: roundPrice(result.regularMarketChangePercent),
            previousClose: roundPrice(result.regularMarketPreviousClose),
            dayHigh: roundPrice(result.regularMarketDayHigh),
            dayLow: roundPrice(result.regularMarketDayLow),
            marketState: result.marketState, // "REGULAR", "PRE", "POST", "CLOSED"
        };

        cache.set(cacheKey, { data: summary, timestamp: Date.now() });
        return summary;

    } catch (error) {
        console.error("❌ Price Summary Error:", error.message);
        return null;
    }
}

// ── Helpers ──

function roundPrice(val) {
    if (val == null || isNaN(val)) return 0;
    return Math.round(val * 100) / 100;
}

function getStartDate(period) {
    const now = new Date();
    const match = period.match(/^(\d+)([dmy])$/);
    if (!match) return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // default 7d

    const [, num, unit] = match;
    const n = parseInt(num);

    switch (unit) {
        case "d": return new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
        case "m": return new Date(now.setMonth(now.getMonth() - n));
        case "y": return new Date(now.setFullYear(now.getFullYear() - n));
        default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
}
