# NifnityX 🚀
### Intelligent Automated Trading Decision & Support System

> **Project Code:** 2526_SDP8  
> **Team:** Meet Mehta · Dhruval Patel

---

## 📌 Overview

**NifnityX** is a professional-grade, end-to-end intelligent trading decision and support system built for the Indian stock market (Nifty 50). It seamlessly integrates a **high-fidelity React dashboard**, a **robust Node.js backend**, and a **high-performance Python simulation engine** to deliver real-time signal generation, multi-strategy paper trading, and institutional-grade quant analytics.

The system is designed for high-impact demonstrations, featuring **WebSocket-driven real-time updates**, **ML-based trade scoring**, and a **"Quant" Analytics Hub** that tracks sophisticated risk metrics like Sharpe and Sortino ratios.

---

## ✨ Key Features

### 📊 Advanced Quant Analytics (The "Quants" View)
- **Risk-Adjusted Performance**: Live calculation of **Sharpe Ratio** and **Sortino Ratio**.
- **Drawdown Analysis**: Visual waterfall charts showing peak-to-trough capital degradation.
- **Equity Curve**: Premium animated AreaCharts with emerald gradients showing account growth.
- **ML Accuracy Scatter**: Correlation analysis between ML confidence scores and actual trade P&L.

### 🤖 Signal Intelligence & Execution
- **3-Layer Scoring**: Signals evaluated via Technical, Sentiment, and ML models.
- **Human-in-the-Loop**: 15-second "hot" approval window for manual trade confirmation.
- **Live HUD**: Real-time header displaying Session P&L, IST Clock, and Engine Status.
- **WebSocket Sync**: Dashboard KPIs (P&L, Win Rate) update instantly via Socket.io without polling.

### 🔁 Execution & Strategy Management
- **Hot-Swap Strategies**: Switch between `sniper`, `balanced`, `aggressive`, and `conservative` live via Settings.
- **Runtime Tuning**: Adjust Capital, Risk per Trade, and Signal Frequency at runtime with `localStorage` persistence.
- **Trade History**: Persistent log of all executed trades with deep-dive detail panels.

### 🎨 Premium Fintech UI/UX
- **Modern Aesthetic**: Dark-mode design with **Inter** and **JetBrains Mono** typography.
- **Glassmorphism**: Semi-transparent UI elements with sophisticated glow and shimmer effects.
- **Micro-Animations**: Staggered card entrance and cubic-ease-out counter animations for a premium feel.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Recharts, TradingView Widget |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose) |
| **Real-Time** | Socket.io (Broadcasting `stats_update` and `new_signal` events) |
| **Engine** | Python 3.x (Flask/FastAPI Webhooks) |
| **ML Scoring** | Python (NLP + technical signal scoring) |

---

## 🗂️ Project Structure

```
2526_sdp8_NifnityX/
│
├── NIFNITYX/
│   ├── nifnityx_webapp/
│   │   ├── backend/              # Node.js + Express REST API (Auth, Trade Logic, Analytics)
│   │   │   ├── controllers/      # Business logic (Sharpe/Sortino calculations)
│   │   │   └── index.js          # Core server & Socket.io initialization
│   │   └── frontend/             # React SPA (Vite + Tailwind v4)
│   │       ├── src/pages/        # Dashboard, Analytics, Signals, Settings
│   │       └── src/contexts/     # Global Trade & WebSocket State
│   │
│   ├── demo_simulation.py        # High-speed Python trading simulation engine
│   ├── simulation_paper_trading.py # Original paper trading engine
│   ├── data/
│   │   └── NIFTY_1MIN_2025.csv       # 1-minute OHLCV candle data (2025)
│   └── simulation_logs/              # Auto-generated CSV trade logs for offline review
│
├── Learning/                         # Research notes and NLP/trading experiments
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **Python**: v3.10+
- **MongoDB**: Active local instance or MongoDB Atlas URI
- **Browser**: Modern browser (Chrome/Edge recommended for glassmorphism support)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/meetmehta136/2526_sdp8_NifnityX.git
cd 2526_sdp8_NifnityX/NIFNITYX/nifnityx_webapp/backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment
Create a `.env` file in `NIFNITYX/nifnityx_webapp/backend/`:
```env
MONGO_URI=your_mongodb_uri
PORT=5000
PYTHON_SECRET=nifnityx-python-key
```

### 3. Launch the Platform
1. **Start Backend**: `cd backend && npm run dev`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Start Simulation**: 
   ```bash
   # From the NIFNITYX root directory
   python demo_simulation.py
   ```

---

## 👥 Contributors

| Name | Primary Contributions |
|---|---|
| **Meet Mehta** | NLP Research, Analytics Engine (Sharpe/Sortino/Drawdown), Strategy Tuning modules, Simulation Engine development. |
| **Dhruval Patel** | Frontend Architecture, Dashboard & Analytics UI, WebSocket Sync integration, Signal Intelligence Hub, Navigation & UX. |

---

## 🗓️ Development Log (Phase 3 Upgrade)

### Phase 3: Advanced Quant Analytics
- Implemented time-series capital tracking and **Drawdown Analysis**.
- Integrated **Sharpe Ratio** and **Sortino Ratio** into the backend controller.
- Built a multi-zone **Analytics Dashboard** with Recharts integration.

### Phase 2: Signal Intelligence & Real-time Sync
- Developed the dedicated **Signals page** with 3-layer scoring visualization.
- Implemented **Socket.io broadcasting** to update Dashboard KPIs in real-time.
- Added **Split-screen Login** and branded **Splash screen**.

---

## 📄 License
This project was developed as part of an academic Software Development Project (SDP). All rights reserved by the contributors.

---
> *NifnityX — Trade Smarter, Not Harder.*
