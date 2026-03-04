# 2526_sdp8_NifnityX
Intellegnt Automated Trading  Decision &amp; Support System


**LAB-3 | 22-12-2025**
**Dhruval Patel**
- **Planning & Charts:** I spent some time planning the "NifnityX" dashboard layout to figure out the main pages we need, like the Strategy Tuner, Trade History, and Broker Keys. I also found that the TradingView widget doesn't support Nifty 50 for free, so I had to start researching other trading chart widgets.

**Meet Mehta**
- **Learning NLP:** I created Trading Settings related code for logging and other Global trading settings.

----------------------------------
**LAB-2 | 15-12-2025**
**Dhruval Patel**
- **Planning & Charts:** I spent some time planning the "NifnityX" dashboard layout to figure out the main pages we need, like the Strategy Tuner, Trade History, and Broker Keys. I also found that the TradingView widget doesn't support Nifty 50 for free, so I had to start researching other trading chart widgets.

**Meet Mehta**
- **Learning NLP:** I created Trading Settings related code for logging and other Global trading settings.

----------------------------------
**LAB-1 | 08-12-2025**
**Dhruval Patel**
- **The Charts:** I spent some time figuring out the best way to show stock data. Instead of building a graph from scratch (which is complex), I found out I can just embed the **TradingView widget**. It’s way smoother and gives us live Nifty 50 data for free.

**Meet Mehta**
- **Learning NLP:** I watched a bunch of NLP tutorials on YouTube to figure out how to process the market data.

---

## Demo Setup (2025 data)
To run a full demo for the interviewer using only 2025 historical candles and exercise all four strategies:

1. **Start the Node.js backend** from `NIFNITYX/nifnityx_webapp/backend`:
   ```powershell
   npm install   # if not already done
   npm run dev
   ```
   Make sure MongoDB is running and `.env` has `PYTHON_EXECUTION_URL=http://localhost:8000`.

2. **Start the React frontend** from `.../frontend`:
   ```powershell
   npm install
   npm run dev
   ```
   Login with your test account (or create one) and navigate to the dashboard.

3. **Run the Python simulation engine** using the *full 2025 dataset*:
   ```bash
   cd NIFNITYX
   python simulation_paper_trading.py --data data/NIFTY_1MIN_2025.csv --no-filter
   ```
   The engine will replay every candle from 2025 at CPU speed, pause 15 s after each signal for you to click “Approve” in the UI, and post trade updates to the Node.js backend.
   - The script accepts `--port <n>` if you prefer a specific port (default is 8000).
   - If the chosen port is busy it will automatically pick a free one and print a reminder to update
     `PYTHON_EXECUTION_URL` in your Node.js `.env` (e.g. `http://localhost:8001/api/trade`).

4. **Switch strategies live** via the UI:
   - Open **Settings → Strategy Tuner** in the frontend.
   - Choose one of the four strategies (`sniper`, `balanced`, `aggressive`, `conservative`).
   - The backend will persist and hot‑swap the Python engine automatically.

5. **View analytics**:
   - Go to **Dashboard → Analytics**.
   - Select the strategy you want to inspect with the dropdown; data will load for all executed trades.
   - You can also change time ranges and execution mode (paper/live) but for the demo keep it on PAPER.

All trade history, P&L, cost breakdown and ML scores will be shown accurately; the engine stores a CSV log under `simulation_logs/` for offline review.

> ⚠️ By default the simulation trims the file to the last 60 days for speed. Use `--no-filter` to replay the full year of 2025.

This setup gives you a self‑contained demonstration: no live broker, all analytics working, and you can show the interviewer hot‑swapping strategies and reviewing complete history.
