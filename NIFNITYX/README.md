<div align="center">

# 🏛️ NifnityX

### **Institutional-Grade Algorithmic Trading Intelligence**

*The High-Performance Bridge Between Quantitative Models and Market Execution*

<br/>

[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python_3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

<br/>

<img src="https://img.shields.io/badge/Status-Live_&_Operational-00C853?style=flat-square&logo=statuspage&logoColor=white" />
<img src="https://img.shields.io/badge/Version-3.0-blue?style=flat-square" />
<img src="https://img.shields.io/badge/Signals_Processed-10K+-purple?style=flat-square" />
<img src="https://img.shields.io/badge/Win_Rate-~70%25-emerald?style=flat-square" />

---

**`Project Code`** 2526_SDP8 &nbsp;•&nbsp; **`Team`** Meet Mehta · Dhruval Patel

</div>

<br/>

## 🎯 What is NifnityX?

> **NifnityX** is a full-stack algorithmic trading ecosystem that combines **ML-powered signal generation**, **real-time WebSocket execution**, and **institutional quant analytics** into one seamless platform — purpose-built for the Indian **Nifty 50** market.

Unlike basic dashboards that only display data, NifnityX **thinks**, **scores**, **executes**, and **evaluates** — providing a closed-loop trading intelligence system.

<br/>

<div align="center">

```
┌─────────────────────────────────────────────────────────────────┐
│                    NifnityX Data Pipeline                       │
│                                                                 │
│   📊 Market Data ──► 🧠 ML Scoring ──► ⚡ Signal Generation    │
│         │                                      │                │
│         ▼                                      ▼                │
│   📈 Live Charts        15s Hot Approval ◄── 📡 WebSocket      │
│                                │                                │
│                                ▼                                │
│                     ✅ Trade Execution                          │
│                          │                                      │
│                          ▼                                      │
│              📊 Quant Analytics Engine                          │
│         Sharpe · Sortino · Drawdown · Equity                    │
└─────────────────────────────────────────────────────────────────┘
```

</div>

<br/>

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph PY["🐍 Python Quant Engine"]
        A[OHLCV Data Replay] --> B[Strategy Layer]
        B --> C[ML Signal Scorer]
    end

    subgraph NODE["⚙️ Node.js API Gateway"]
        D[REST Controllers] --> E[(MongoDB)]
        D --> F[Socket.io Hub]
    end

    subgraph REACT["⚛️ React Analytics UI"]
        G[Dashboard HUD] --> H[Equity Curves]
        G --> I[Signal Feed]
        G --> J[Risk Metrics]
    end

    C -- "HTTP Webhook" --> D
    F -- "stats_update" --> G
    F -- "new_signal" --> I
    F -- "trade_update" --> G

    style PY fill:#1a1a2e,stroke:#e94560,color:#fff
    style NODE fill:#1a1a2e,stroke:#0f3460,color:#fff
    style REACT fill:#1a1a2e,stroke:#16213e,color:#fff
```

<br/>

---

## ✨ Feature Deep-Dive

<details>
<summary><h3>📊 &nbsp; Advanced Quant Analytics Engine &nbsp; <sup><em>click to expand</em></sup></h3></summary>

<br/>

NifnityX evaluates performance using the same metrics as hedge funds and proprietary trading desks:

| Metric | Formula | What It Measures |
|---|---|---|
| **Sharpe Ratio** | `(Rp - Rf) / σp` | Excess return per unit of total risk |
| **Sortino Ratio** | `(Rp - Rf) / σd` | Return per unit of **downside** risk only |
| **Max Drawdown** | `max(peak - trough) / peak` | Worst capital degradation from peak |
| **Win/Loss Streak** | Consecutive tracking | Strategy stability over time |
| **ML Accuracy** | `correct_predictions / total` | Model confidence vs realized outcome |

**Visualizations include:**
- 📉 **Drawdown Waterfall Chart** — Peak-to-trough capital erosion timeline
- 📈 **Equity Curve** — Animated AreaChart with emerald-indigo gradient fill
- 📊 **P&L Distribution** — Daily returns histogram with standard deviation bands
- 🎯 **ML Scatter Plot** — Confidence score vs actual P&L correlation

</details>

<details>
<summary><h3>📡 &nbsp; Real-Time WebSocket Intelligence &nbsp; <sup><em>click to expand</em></sup></h3></summary>

<br/>

NifnityX achieves **zero-latency UI updates** through a persistent Socket.io connection:

```
Backend Trade Close ──► Socket.io "stats_update" ──► Dashboard KPIs refresh
                   ──► Socket.io "new_signal"    ──► Signal Feed card appears
                   ──► Socket.io "trade_update"  ──► Trade status transitions
```

**No polling. No page refreshes.** The dashboard is always live.

- ⚡ **Instant P&L Counter**: Cubic-ease-out animated numbers that "pop" on every trade close
- 🕐 **Live IST Clock**: Real-time Indian Standard Time in the header HUD
- 🟢 **Engine Heartbeat**: Visual indicator showing Python engine connection status

</details>

<details>
<summary><h3>🧠 &nbsp; 3-Layer Signal Evaluation &nbsp; <sup><em>click to expand</em></sup></h3></summary>

<br/>

Every signal passes through a triple-filter before reaching the trader:

```
Layer 1: Technical Analysis    ──► RSI, MACD, Moving Averages
Layer 2: Sentiment Analysis    ──► NLP-based market sentiment scoring
Layer 3: ML Prediction Model   ──► Deep learning confidence score
                                        │
                                        ▼
                               Composite Score (0-100)
                                        │
                              ┌─────────┼─────────┐
                              │         │         │
                           Score<40  40-70    Score>70
                            REJECT   REVIEW   AUTO-EXEC
```

</details>

<details>
<summary><h3>🔁 &nbsp; Multi-Strategy Hot-Swap Engine &nbsp; <sup><em>click to expand</em></sup></h3></summary>

<br/>

Four battle-tested strategies, swappable at runtime with **zero downtime**:

| Strategy | Risk Profile | Signal Freq | Best For |
|---|---|---|---|
| 🎯 **Sniper** | Ultra-Low | ~1 per 5min | Precision scalping, tight stops |
| ⚖️ **Balanced** | Moderate | ~1 per 2min | Consistent daily returns |
| 🔥 **Aggressive** | High | ~1 per 30s | Momentum capture, volatile sessions |
| 🛡️ **Conservative** | Minimal | ~1 per 10min | Capital preservation mode |

**Runtime Tuning via Settings:**
- 💰 Capital Allocation (₹50K – ₹50L)
- 📊 Risk Per Trade (0.5% – 5%)
- ⏱️ Signal Frequency Multiplier

</details>

<details>
<summary><h3>🎨 &nbsp; Premium Fintech UI/UX &nbsp; <sup><em>click to expand</em></sup></h3></summary>

<br/>

Designed to match the aesthetic standards of Bloomberg Terminal and Zerodha Kite:

- 🌑 **Dark Mode First** — Engineered for extended trading sessions
- 🔮 **Glassmorphism** — Semi-transparent cards with backdrop blur and glow effects
- ✨ **Micro-Animations** — Staggered entrance, shimmer loading states, pulsing indicators
- 🔤 **Pro Typography** — Inter (UI) + JetBrains Mono (data) for maximum readability
- 🖥️ **Split-Screen Auth** — Professional login with animated background orbs

</details>

<br/>

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technologies | Purpose |
|:---:|---|---|
| **Frontend** | React 19 · Vite · Tailwind v4 · Recharts · TradingView | Analytics visualization & trading interface |
| **Backend** | Node.js · Express · Socket.io · Mongoose | REST API, auth, real-time broadcasting |
| **Database** | MongoDB (Atlas / Local) | Trade persistence, user management |
| **Engine** | Python 3.x · Flask · NumPy | Signal generation, ML scoring, backtesting |
| **DevOps** | Git · GitHub · Nodemon | Version control, CI workflow |

</div>

<br/>

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/meetmehta136/2526_sdp8_NifnityX.git
cd 2526_sdp8_NifnityX/NIFNITYX

# 2. Backend
cd nifnityx_webapp/backend
npm install
# Configure .env with MONGO_URI, PYTHON_EXECUTION_URL, PYTHON_SECRET
npm run dev

# 3. Frontend (new terminal)
cd nifnityx_webapp/frontend
npm install
npm run dev

# 4. Python Engine (new terminal)
pip install -r requirements.txt
python demo_simulation.py
```

<details>
<summary><strong>📋 Environment Variables Reference</strong></summary>

```env
# backend/.env
MONGO_URI=mongodb+srv://your_connection_string
PORT=5000
PYTHON_EXECUTION_URL=http://localhost:8000
PYTHON_SECRET=nifnityx-python-key
JWT_SECRET=your_jwt_secret
```

</details>

<br/>

---

## 📁 Project Structure

```
NIFNITYX/
├── nifnityx_webapp/
│   ├── backend/
│   │   ├── controllers/          # Trade logic, analytics (Sharpe/Sortino), auth
│   │   ├── routes/               # RESTful API endpoints
│   │   ├── models/               # MongoDB schemas (User, Trade)
│   │   └── index.js              # Express + Socket.io initialization
│   │
│   └── frontend/
│       ├── src/
│       │   ├── pages/            # Dashboard, Analytics, Signals, Settings, Login
│       │   ├── components/       # Glassmorphism cards, HUD, charts
│       │   ├── contexts/         # TradeContext (global WebSocket state)
│       │   └── lib/              # Socket.io client, API helpers
│       └── index.css             # Premium design tokens & animations
│
├── demo_simulation.py            # High-speed demo signal generator
├── simulation_paper_trading.py   # Production paper trading engine
├── data/
│   └── NIFTY_1MIN_2025.csv      # 1-minute OHLCV (full 2025 dataset)
└── simulation_logs/              # Auto-generated CSV trade reports
```

<br/>

---

## 👥 Engineering Team

<div align="center">

| <img src="https://github.com/meetmehta136.png" width="80" style="border-radius: 50%"/> | <img src="https://github.com/dhruvalpatel-dev.png" width="80" style="border-radius: 50%"/> |
|:---:|:---:|
| **Meet Mehta** | **Dhruval Patel** |
| Quant Engine · ML/NLP · Strategy Logic | Frontend Architecture · WebSocket · UI/UX |
| [![GitHub](https://img.shields.io/badge/-meetmehta136-181717?style=flat-square&logo=github)](https://github.com/meetmehta136) | [![GitHub](https://img.shields.io/badge/-dhruvalpatel--dev-181717?style=flat-square&logo=github)](https://github.com/dhruvalpatel-dev) |

</div>

<br/>

---

## 🗓️ Development Timeline

| Phase | Focus | Key Deliverables |
|---|---|---|
| **Phase 1** | Foundation | Dashboard layout, TradingView integration, Python engine |
| **Phase 2** | Intelligence | Signal scoring, human-in-the-loop approval, WebSocket sync |
| **Phase 3** | Analytics | Sharpe/Sortino ratios, drawdown analysis, equity curves |
| **Phase 4** | Polish | Glassmorphism UI, micro-animations, Settings page, demo engine |

<br/>

---

<div align="center">

### 📄 License

This project was developed as part of an academic **Software Development Project (SDP)**.
All intellectual property rights remain with the contributors.

<br/>

---

<br/>

<img src="https://img.shields.io/badge/NifnityX-Precision_Execution._Institutional_Intelligence.-000000?style=for-the-badge" />

<sub>Built with ❤️ by Meet Mehta & Dhruval Patel · 2025–2026</sub>

</div>
