"""
strategies/base_strategy.py
────────────────────────────────────────────────
Abstract base class + shared data contracts.

Every strategy:
  1. Receives a StrategyContext (immutable system snapshot)
  2. Returns a DecisionDict (complete, always-valid output)
  3. Must implement: evaluate(), calculate_lot_size(), risk_check()

Node.js payload contract is NEVER touched here — that stays in
LivePaperTradingSystem.evaluate_signal().  Strategy only decides
execute=True/False and lots=N.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  IMMUTABLE SYSTEM SNAPSHOT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class StrategyContext:
    """
    Immutable snapshot of the trading system state.
    Built fresh before every evaluate() call.
    Frozen so strategies can't accidentally mutate system state.
    """
    # Capital
    capital:          float
    initial_capital:  float
    peak_capital:     float      # Highest capital seen this session

    # Daily counters  (reset at market open each day)
    daily_pnl:        float      # Net P&L for today (after costs)
    daily_trades:     int        # Signals executed today
    daily_losses:     int        # Closed losing trades today
    daily_wins:       int        # Closed winning trades today

    # Position state
    open_positions:   int        # Currently open positions

    # Streak counters (session-level, reset daily by LivePaperTradingSystem)
    loss_streak:      int        # Consecutive losses in a row

    # Clock
    current_time:     datetime

    # ── Derived helpers (computed from frozen fields) ──────────────────────

    @property
    def drawdown_pct(self) -> float:
        """Current drawdown from session peak as a percentage (0–100)."""
        if self.peak_capital <= 0:
            return 0.0
        return (self.peak_capital - self.capital) / self.peak_capital * 100

    @property
    def daily_drawdown_pct(self) -> float:
        """Today's loss as percentage of starting capital."""
        if self.initial_capital <= 0:
            return 0.0
        return max(0.0, -self.daily_pnl) / self.initial_capital * 100

    @property
    def current_hour(self) -> int:
        return self.current_time.hour

    @property
    def current_minute(self) -> int:
        return self.current_time.minute


# ─────────────────────────────────────────────────────────────────────────────
#  DECISION OUTPUT CONTRACT
# ─────────────────────────────────────────────────────────────────────────────

class DecisionDict(dict):
    """
    Strategy decision output.

    Guaranteed keys (always present, never None):
      execute          bool   — whether to place the trade
      reason           str    — human-readable explanation (for logs/UI)
      lots             float  — position size (0.5 grid, min 0.5)
      technical_score  float  — raw Layer 1 score
      sentiment_score  float  — raw Layer 2 score
      ml_score         float  — raw Layer 3 score
      final_score      float  — sum of all three
      disaster_flag    bool   — Layer 2 disaster detected
      strategy_name    str    — which strategy made this decision
      risk_blocked     bool   — True if risk_check() returned False

    The Node.js payload builder reads execute, lots, and the score breakdown.
    Everything else stays the same.
    """
    REQUIRED_KEYS = frozenset({
        "execute", "reason", "lots",
        "technical_score", "sentiment_score", "ml_score", "final_score",
        "disaster_flag", "strategy_name", "risk_blocked",
    })

    def validate(self) -> None:
        missing = self.REQUIRED_KEYS - self.keys()
        if missing:
            raise ValueError(f"DecisionDict missing required keys: {missing}")


# ─────────────────────────────────────────────────────────────────────────────
#  ABSTRACT BASE STRATEGY
# ─────────────────────────────────────────────────────────────────────────────

class BaseStrategy(ABC):
    """
    Plug-and-play strategy interface.

    Subclass and implement the three abstract methods.
    All strategies share the same _build_decision() helper so the
    output schema is always consistent.
    """

    NAME: str = "base"   # Override in every subclass

    # ── Required interface ────────────────────────────────────────────────

    @abstractmethod
    def evaluate(
        self,
        signal:         Dict[str, Any],
        sentiment_data: Dict[str, Any],
        ml_data:        Dict[str, Any],
        context:        StrategyContext,
    ) -> DecisionDict:
        """
        Full signal evaluation.
        Combines technical + sentiment + ML scores, applies strategy-specific
        thresholds, and returns a complete DecisionDict.

        Internally calls risk_check() first — callers do NOT need to call it
        separately (but may call it for early-exit optimisation).
        """
        ...

    @abstractmethod
    def calculate_lot_size(
        self,
        ml_score: float,
        context:  StrategyContext,
    ) -> float:
        """
        Return fractional lot size based on ML confidence and account state.
        Minimum value: 0.5.  Values are on a 0.25 grid (0.5, 0.75, 1.0 …).
        """
        ...

    @abstractmethod
    def risk_check(self, context: StrategyContext) -> bool:
        """
        Hard risk gate evaluated BEFORE any scoring logic.
        Return False to block ALL trading (position limit, drawdown, time, etc.)
        Returning False sets risk_blocked=True in the DecisionDict.
        """
        ...

    # ── Shared helpers (available to all subclasses) ──────────────────────

    @staticmethod
    def _build_decision(
        *,
        execute:         bool,
        reason:          str,
        lots:            float,
        technical_score: float,
        sentiment_score: float,
        ml_score:        float,
        final_score:     float,
        disaster_flag:   bool,
        strategy_name:   str,
        risk_blocked:    bool = False,
    ) -> DecisionDict:
        """
        Guaranteed-schema factory.  Always use this — never construct
        DecisionDict manually in subclasses.
        """
        d = DecisionDict(
            execute=execute,
            reason=reason,
            lots=max(0.5, lots),             # floor at 0.5
            technical_score=technical_score,
            sentiment_score=sentiment_score,
            ml_score=ml_score,
            final_score=final_score,
            disaster_flag=disaster_flag,
            strategy_name=strategy_name,
            risk_blocked=risk_blocked,
        )
        d.validate()
        return d

    # ── Risk-blocked shortcut ─────────────────────────────────────────────

    def _risk_blocked_decision(
        self,
        reason:         str,
        technical_score: float = 0.0,
        sentiment_score: float = 0.0,
        ml_score:        float = 0.0,
        final_score:     float = 0.0,
        disaster_flag:   bool  = False,
    ) -> DecisionDict:
        """Return a no-execute decision because risk_check failed."""
        return self._build_decision(
            execute=False,
            reason=reason,
            lots=0.5,
            technical_score=technical_score,
            sentiment_score=sentiment_score,
            ml_score=ml_score,
            final_score=final_score,
            disaster_flag=disaster_flag,
            strategy_name=self.NAME,
            risk_blocked=True,
        )

    def __repr__(self) -> str:
        return f"<Strategy: {self.NAME}>"