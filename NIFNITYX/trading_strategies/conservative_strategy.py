"""
strategies/conservative_strategy.py
────────────────────────────────────────────────
CONSERVATIVE STRATEGY

Maximum capital protection. Very selective. Three hard safety layers
that are completely independent of score thresholds.

Profile:
  For cautious traders, high-probability setups only.
  Operates in a tighter time window to avoid choppy open/close periods.
  Locks out trading for the day after 2 consecutive losses — the
  professional "know when to walk away" rule.

┌─────────────────────────────────────────────┐
│  MIN_SCORE            70   (out of 120)     │
│  ML_BLOCK_THRESHOLD   22   (out of 40)      │
│  ML_STRONG_THRESHOLD  28   (out of 40)      │
│  Lot tiers        0.5 / 0.75 / 1.0         │
│  Max positions        1  (single focus)     │
│  Max daily trades     2                     │
│  Daily drawdown       1.5%                  │
│  Trading window       10:00 – 14:30 IST     │
│  Lock after 2 daily consecutive losses      │
└─────────────────────────────────────────────┘

Notes on professional decisions embedded here:
  • 10:00 start avoids the chaotic 9:15–10:00 gap-fill phase
  • 14:30 end avoids the 3:00–3:30 expiry/repo panic spike zone
  • Daily reset on loss lockout — fresh slate every morning
    (permanent lockout punishes the strategy, not just the trader)
  • Lot cap at 1.0 — conservative never sizes aggressively
"""

from __future__ import annotations

from datetime import time as dtime
from typing import Any, Dict

from .base_strategy import BaseStrategy, DecisionDict, StrategyContext


# IST trading window
_WINDOW_START = dtime(10, 0)   # 10:00 AM
_WINDOW_END   = dtime(14, 30)  # 02:30 PM


class ConservativeStrategy(BaseStrategy):

    NAME = "conservative"

    MIN_SCORE            = 70
    ML_BLOCK_THRESHOLD   = 22
    ML_STRONG_THRESHOLD  = 28

    MAX_POSITIONS    = 1
    MAX_DAILY_TRADES = 2
    MAX_DAILY_DD_PCT = 1.5     # % of initial_capital

    # Daily loss lockout (reset every morning automatically via daily_losses counter)
    LOCKOUT_AFTER_LOSSES = 2

    def _in_trading_window(self, context: StrategyContext) -> bool:
        """True only between 10:00 and 14:30 IST."""
        t = context.current_time.time()
        return _WINDOW_START <= t <= _WINDOW_END

    def _is_locked_out(self, context: StrategyContext) -> bool:
        """
        True when consecutive DAILY losses has hit the lockout threshold.
        daily_losses resets each morning, so this is purely intraday.
        """
        return context.daily_losses >= self.LOCKOUT_AFTER_LOSSES

    def risk_check(self, context: StrategyContext) -> bool:
        """
        Conservative has 4 independent hard gates — any one can block:
          1. Time window (10:00–14:30)
          2. Daily loss lockout (2 losses)
          3. Daily drawdown cap (1.5%)
          4. Open position cap (max 1)
          5. Daily trade cap (max 2)
        """
        if not self._in_trading_window(context):
            return False
        if self._is_locked_out(context):
            return False
        if context.daily_drawdown_pct >= self.MAX_DAILY_DD_PCT:
            return False
        if context.open_positions >= self.MAX_POSITIONS:
            return False
        if context.daily_trades >= self.MAX_DAILY_TRADES:
            return False
        return True

    def calculate_lot_size(self, ml_score: float, context: StrategyContext) -> float:
        """
        Conservative tiers — never exceeds 1.0 lot.
          ML < 22  → 0.5   (minimum, just testing the water)
          ML < 28  → 0.75  (standard)
          ML ≥ 28  → 1.0   (high-conviction maximum)
        """
        if ml_score < self.ML_BLOCK_THRESHOLD:
            return 0.5
        elif ml_score < self.ML_STRONG_THRESHOLD:
            return 0.75
        else:
            return 1.0

    def evaluate(
        self,
        signal:         Dict[str, Any],
        sentiment_data: Dict[str, Any],
        ml_data:        Dict[str, Any],
        context:        StrategyContext,
    ) -> DecisionDict:

        # ── 0. Hard risk gate (with specific reasons for each block) ──────
        if not self._in_trading_window(context):
            ct = context.current_time.strftime("%H:%M")
            return self._risk_blocked_decision(
                reason=(
                    f"🕐 Outside trading window {ct} "
                    f"(conservative: {_WINDOW_START.strftime('%H:%M')}–"
                    f"{_WINDOW_END.strftime('%H:%M')} only)"
                )
            )

        if self._is_locked_out(context):
            return self._risk_blocked_decision(
                reason=(
                    f"🔒 Daily loss lockout triggered "
                    f"({context.daily_losses} losses today ≥ {self.LOCKOUT_AFTER_LOSSES})"
                    f" — resuming tomorrow"
                )
            )

        if context.daily_drawdown_pct >= self.MAX_DAILY_DD_PCT:
            return self._risk_blocked_decision(
                reason=(
                    f"🔒 Daily DD cap: {context.daily_drawdown_pct:.2f}% "
                    f"≥ {self.MAX_DAILY_DD_PCT}%"
                )
            )

        if context.open_positions >= self.MAX_POSITIONS:
            return self._risk_blocked_decision(
                reason=f"🔒 Max 1 position active — conservative doesn't stack"
            )

        if context.daily_trades >= self.MAX_DAILY_TRADES:
            return self._risk_blocked_decision(
                reason=f"🔒 Daily trade limit reached ({self.MAX_DAILY_TRADES})"
            )

        # ── 1. Scores ─────────────────────────────────────────────────────
        technical_score = float(signal.get("technical_score", 60))
        sentiment_score = float(sentiment_data.get("sentiment_boost", 0))
        disaster_flag   = bool(sentiment_data.get("disaster_flag", False))
        ml_score        = float(ml_data.get("ml_score", 20.0))
        final_score     = technical_score + sentiment_score + ml_score

        # ── 2. ML hard block ──────────────────────────────────────────────
        if ml_score < self.ML_BLOCK_THRESHOLD:
            return self._build_decision(
                execute=False,
                reason=(
                    f"❌ ML confidence too low for conservative "
                    f"({ml_score:.0f} < {self.ML_BLOCK_THRESHOLD})"
                ),
                lots=0.5,
                technical_score=technical_score,
                sentiment_score=sentiment_score,
                ml_score=ml_score,
                final_score=final_score,
                disaster_flag=disaster_flag,
                strategy_name=self.NAME,
            )

        # ── 3. Disaster block ─────────────────────────────────────────────
        if disaster_flag:
            return self._build_decision(
                execute=False,
                reason="🚨 DISASTER — conservative definitely sitting out",
                lots=0.5,
                technical_score=technical_score,
                sentiment_score=sentiment_score,
                ml_score=ml_score,
                final_score=final_score,
                disaster_flag=True,
                strategy_name=self.NAME,
            )

        # ── 4. Score threshold ────────────────────────────────────────────
        if final_score >= self.MIN_SCORE:
            lots  = self.calculate_lot_size(ml_score, context)
            label = (
                f"🎯 Conservative high-quality entry — score {final_score:.1f}"
                f" | ML {ml_score:.0f}/40"
                f" | {lots}L"
            )
            return self._build_decision(
                execute=True,
                reason=label,
                lots=lots,
                technical_score=technical_score,
                sentiment_score=sentiment_score,
                ml_score=ml_score,
                final_score=final_score,
                disaster_flag=False,
                strategy_name=self.NAME,
            )

        # ── 5. Score too low ──────────────────────────────────────────────
        return self._build_decision(
            execute=False,
            reason=(
                f"❌ Score {final_score:.1f} below conservative bar "
                f"({self.MIN_SCORE}) — waiting for perfect setup"
            ),
            lots=0.5,
            technical_score=technical_score,
            sentiment_score=sentiment_score,
            ml_score=ml_score,
            final_score=final_score,
            disaster_flag=False,
            strategy_name=self.NAME,
        )