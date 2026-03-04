# NifnityX 🚀
### Intelligent Automated Trading Decision & Support System

> **Project Code:** 2526_SDP8  
> **Team:** Meet Mehta · Dhruval Patel

## 📌 Overview

**NifnityX** is an end-to-end intelligent trading decision and support system built around the Indian stock market (Nifty 50). It combines a **React-based dashboard**, a **Node.js REST backend**, and a **Python simulation engine** to deliver real-time trade signal generation, multi-strategy paper trading, and deep analytics — all in a single integrated platform.

The system supports four distinct trading strategies that can be hot-swapped live without restarting any service, and includes full P&L tracking, ML-based trade scoring, and a human-in-the-loop approval workflow.

---

## ✨ Features

- 📈 **Live & Historical Chart Integration** — TradingView widget embedded for real-time Nifty 50 market data
- 🤖 **Automated Signal Generation** — Python simulation engine replays 1-minute OHLCV candles and emits trade signals
- 🧠 **ML Trade Scoring** — Each signal is scored by a machine learning model before being surfaced to the trader
- ✅ **Human-in-the-Loop Approval** — 15-second approval window per signal; trades confirmed via the UI
- 🔁 **Hot-Swap Strategies** — Switch between `sniper`, `balanced`, `aggressive`, and `conservative` strategies live via Settings
- 📊 **Analytics Dashboard** — Full P&L, cost breakdown, and ML score history per strategy and time range
- 🗂️ **Trade History** — Persistent log of all executed trades with execution mode (paper/live) tracking
- 🔑 **Broker Key Management** — Secure storage and management of broker API credentials
- 📝 **CSV Simulation Logs** — Offline-reviewable trade logs saved under `simulation_logs/`

---

## 🗂️ Project Structure

```
2526_sdp8_NifnityX/
│
├── NIFNITYX/
│   ├── nifnityx_webapp/
│   │   ├── backend/              # Node.js + Express REST API
│   │   │   ├── .env              # Environment config (MongoDB URI, Python URL)
│   │   │   └── ...
│   │   └── frontend/             # React SPA (Dashboard, Analytics, Settings)
│   │
│   ├── simulation_paper_trading.py   # Python trading simulation engine
│   ├── data/
│   │   └── NIFTY_1MIN_2025.csv       # 1-minute OHLCV candle data (2025)
│   └── simulation_logs/              # Auto-generated CSV trade logs
│
├── Learning/                         # Research notes and NLP/trading experiments
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TradingView Widget |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Simulation Engine | Python |
| ML Scoring | Python (NLP + signal scoring) |
| Communication | REST API (HTTP) |

---

## ⚙️ Prerequisites

Make sure the following are installed before running the project:

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://www.python.org/) (v3.9+)
- [MongoDB](https://www.mongodb.com/) (running locally or via Atlas)
- `npm` (comes with Node.js)
- `pip` (comes with Python)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/meetmehta136/2526_sdp8_NifnityX.git
cd 2526_sdp8_NifnityX
```

---

### 2. Configure Environment Variables

Create a `.env` file inside `NIFNITYX/nifnityx_webapp/backend/`:

```env
MONGO_URI=mongodb://localhost:27017/nifnityx
PYTHON_EXECUTION_URL=http://localhost:8000
PORT=5000
```

> ⚠️ If your Python engine runs on a different port (e.g. due to port conflict), update `PYTHON_EXECUTION_URL` accordingly (e.g. `http://localhost:8001/api/trade`).

---

### 3. Start the Node.js Backend

```bash
cd NIFNITYX/nifnityx_webapp/backend
npm install       # First time only
npm run dev
```

Ensure **MongoDB is running** before starting the backend.

---

### 4. Start the React Frontend

```bash
cd NIFNITYX/nifnityx_webapp/frontend
npm install       # First time only
npm run dev
```

Open your browser at `http://localhost:5173` (or the port shown in the terminal). Login with your test account or create a new one.

---

### 5. Run the Python Simulation Engine

```bash
cd NIFNITYX
python simulation_paper_trading.py --data data/NIFTY_1MIN_2025.csv --no-filter
```

**CLI Options:**

| Flag | Description | Default |
|---|---|---|
| `--data <path>` | Path to CSV data file | Required |
| `--no-filter` | Replay full dataset (no 60-day trim) | Off (last 60 days) |
| `--port <n>` | Custom port for the simulation server | `8000` |

> The engine replays every 1-minute candle at CPU speed, pauses **15 seconds** after each signal, and waits for you to click **"Approve"** in the UI before posting the trade to the backend.

---

## 🎮 Demo Walkthrough

This setup gives a fully self-contained demo with **no live broker required**.

### Step-by-step:

1. Start all three services (backend → frontend → Python engine) as described above.
2. **Hot-swap strategies live:**
   - Navigate to **Settings → Strategy Tuner** in the frontend.
   - Select one of: `sniper` · `balanced` · `aggressive` · `conservative`
   - The backend persists the choice and hot-swaps the Python engine automatically — no restart needed.
3. **Approve trade signals:**
   - When the engine emits a signal, a 15-second countdown appears in the UI.
   - Click **"Approve"** to execute the paper trade, or let it expire.
4. **View Analytics:**
   - Go to **Dashboard → Analytics**.
   - Use the strategy dropdown to inspect P&L, cost breakdown, and ML scores per strategy.
   - Change time ranges as needed; keep execution mode on **PAPER** for demo purposes.
5. **Review offline logs:**
   - All trades are saved to `simulation_logs/` as CSV files for offline review.

---

## 📊 Trading Strategies

| Strategy | Description |
|---|---|
| `sniper` | High-precision, low-frequency signals; targets only the strongest setups |
| `balanced` | Moderate risk/reward; blends signal frequency with quality filtering |
| `aggressive` | High-frequency signals; prioritises opportunity capture over precision |
| `conservative` | Low-risk mode; trades only on highest-confidence, low-volatility setups |

---

## 📁 Data

The simulation engine uses `NIFTY_1MIN_2025.csv` — a full year of **1-minute OHLCV candle data** for the Nifty 50 index (2025).

> By default, the script trims the file to the **last 60 days** for speed. Use `--no-filter` to replay the complete 2025 dataset.

---

## 👥 Contributors

| Name | Contributions |
|---|---|
| **Meet Mehta** | NLP research, Python trading settings, global config & logging modules |
| **Dhruval Patel** | Dashboard layout & UI planning, chart research (TradingView), page architecture (Strategy Tuner, Trade History, Broker Keys) |

---

## 🗓️ Development Log

### LAB-3 | 22 Dec 2025
- **Dhruval:** Refined dashboard layout; discovered TradingView free tier doesn't support Nifty 50 — began researching alternative chart widgets.
- **Meet:** Built trading settings module covering global config, logging, and execution flags.

### LAB-2 | 15 Dec 2025
- **Dhruval:** Continued dashboard planning; mapped out required pages (Strategy Tuner, Trade History, Broker Keys).
- **Meet:** Extended NLP research and started integrating signal-processing logic with settings.

### LAB-1 | 08 Dec 2025
- **Dhruval:** Evaluated charting options; chose to embed TradingView widget for smooth live Nifty 50 data.
- **Meet:** Watched NLP tutorials and researched market data processing techniques.

---

## 📄 License

This project was developed as part of an academic Software Development Project (SDP). All rights reserved by the contributors.

---

> *NifnityX — Trade Smarter, Not Harder.*
