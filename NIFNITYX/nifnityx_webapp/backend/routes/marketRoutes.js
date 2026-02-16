import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getChartData, getPriceSummary } from "../utils/marketDataService.js";

const router = express.Router();

// All routes still require user auth (but NOT broker connection)
router.use(protect);

// GET /api/market/chart?symbol=NIFTY&interval=1m
// Free chart data from Yahoo Finance
router.get("/chart", async (req, res) => {
    try {
        const { symbol = "NIFTY", interval = "1m" } = req.query;

        // Validate interval
        const validIntervals = ["1m", "5m", "15m", "1d"];
        if (!validIntervals.includes(interval)) {
            return res.status(400).json({ message: `Invalid interval. Use: ${validIntervals.join(", ")}` });
        }

        const data = await getChartData(symbol, interval);
        res.json(data);

    } catch (error) {
        console.error("Chart API Error:", error);
        res.status(500).json({ message: "Failed to fetch chart data" });
    }
});

// GET /api/market/price?symbol=NIFTY
// Current price + daily change (for dashboard header)
router.get("/price", async (req, res) => {
    try {
        const { symbol = "NIFTY" } = req.query;
        const data = await getPriceSummary(symbol);

        if (!data) {
            return res.status(503).json({ message: "Price data unavailable" });
        }

        res.json(data);

    } catch (error) {
        console.error("Price API Error:", error);
        res.status(500).json({ message: "Failed to fetch price data" });
    }
});

export default router;
