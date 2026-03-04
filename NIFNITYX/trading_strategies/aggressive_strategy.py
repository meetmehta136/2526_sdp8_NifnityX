"""
strategies/aggressive_strategy.py
────────────────────────────────────────────────
AGGRESSIVE STRATEGY

High-frequency, lower ML bar, larger lot sizing.
The key safety net: if daily drawdown crosses 3%, the strategy
automatically operates in "degraded mode" using Balanced-equivalent
thresholds for the rest of the day.  This prevents a bad morning from
becoming a catastrophic day.

Profile:
  Takes more trades, accepts lower ML confidence, but scales up hard
  when signals are strong.  Built for high-volatility trending days.

┌─────────────────────────────────────────────────────────────┐
│  NORMAL MODE                                                │
│    MIN_SCORE           55   (out of 120)                   │
│    ML_BLOCK_THRESHOLD  12   (out of 40)                    │
│    ML_STRONG_THRESHOLD 22   (out of 40)                    │
│    Lot tiers       1.0 / 1.25 / 1.5                       │
│    Max positions       4                                   │
│    Max daily trades    6                                   │
│    Daily drawdown      3.5%                                │
│                                                             │
│  DEGRADED MODE  (triggered when DD > 3.0%)                 │
│    Switches to Balanced thresholds until market close       │
│    Lot tiers       0.75 / 1.0 / 1.25                      │
│    MIN_SCORE           65                                  │
│    ML_BLOCK_THRESHOLD  18                                  │
└─────────────────────────────────────────────────────────────┘
"""

from __future__ import annotations

from typing import Any, Dict

from .base_strategy import BaseStrategy, DecisionDict, StrategyContext


class AggressiveStrategy(BaseStrategy):

    NAME = "aggressive"

    # ── Normal-mode parameters ────────────────────────────────────────────
    MIN_SCORE            = 55
    ML_BLOCK_THRESHOLD   = 12
    ML_STRONG_THRESHOLD  = 22

    MAX_POSITIONS    = 4
    MAX_DAILY_TRADES = 6
    MAX_DAILY_DD_PCT = 3.5       # Hard stop for the day

    # ── Degraded-mode parameters (Balanced equivalent) ────────────────────
    _DEG_MIN_SCORE          = 65
    _DEG_ML_BLOCK_THRESHOLD = 18
    _DEG_ML_MEDIUM_THRESHOLD = 25
    DEGRADED_TRIGGER_PCT    = 3.0   # Switch to degraded when DD exceeds this

    def _is_degraded(self, context: StrategyContext) -> bool:
        """True when intraday drawdown has crossed the safety threshold."""
        return context.daily_drawdown_pct >= self.DEGRADED_TRIGGER_PCT

    def risk_check(self, context: StrategyContext) -> bool:
        """
        Gate order:
          1. Hard daily drawdown cap (3.5% — absolute ceiling)
          2. Open position cap
          3. Daily trade cap
        Degraded mode does NOT block trading — it only tightens thresholds.
        """
        if context.daily_drawdown_pct >= self.MAX_DAILY_DD_PCT:
            return False
        if context.open_positions >= self.MAX_POSITIONS:
            return False
        if context.daily_trades >= self.MAX_DAILY_TRADES:
            return False
        return True

    def calculate_lot_size(self, ml_score: float, context: StrategyContext) -> float:
        """
        Normal:    ML < 12  → 1.0  |  ML < 22  → 1.25  |  ML ≥ 22  → 1.5
        Degraded:  ML < 18  → 0.75 |  ML < 25  → 1.0   |  ML ≥ 25  → 1.25

        In degraded mode we use Balanced sizing — same quality signal, less capital.
        """
        if self._is_degraded(context):
            # Balanced lot tiers
            if ml_score < self._DEG_ML_BLOCK_THRESHOLD:
                return 0.75
            elif ml_score < self._DEG_ML_MEDIUM_THRESHOLD:
                return 1.0
            else:
                return 1.25

        # Normal aggressive tiers
        if ml_score < self.ML_BLOCK_THRESHOLD:
            return 1.0        # Still take the trade, just standard size
        elif ml_score < self.ML_STRONG_THRESHOLD:
            return 1.25
        else:
            return 1.5        # Maximum size on strong ML

    def evaluate(
        self,
        signal:         Dict[str, Any],
        sentiment_data: Dict[str, Any],
        ml_data:        Dict[str, Any],
        context:        StrategyContext,
    ) -> DecisionDict:

        # ── 0. Hard risk gate ─────────────────────────────────────────────
        if not self.risk_check(context):
            return self._risk_blocked_decision(
                reason=(
                    f"🔒 Aggressive hard-stop: daily DD "
                    f"{context.daily_drawdown_pct:.1f}% ≥ {self.MAX_DAILY_DD_PCT}% "
                    f"or position/trade limit reached"
                )
            )

        # ── 1. Degraded mode alert ────────────────────────────────────────
        degraded = self._is_degraded(context)
        if degraded:
            print(
                f"   ⚠️  [AGGRESSIVE→DEGRADED] Daily DD "
                f"{context.daily_drawdown_pct:.1f}% > {self.DEGRADED_TRIGGER_PCT}% "
                f"— applying balanced thresholds for rest of session"
            )

        active_min_score   = self._DEG_MIN_SCORE          if degraded else self.MIN_SCORE
        active_ml_block    = self._DEG_ML_BLOCK_THRESHOLD if degraded else self.ML_BLOCK_THRESHOLD

        # ── 2. Scores ─────────────────────────────────────────────────────
        technical_score = float(signal.get("technical_score", 60))
        sentiment_score = float(sentiment_data.get("sentiment_boost", 0))
        disaster_flag   = bool(sentiment_data.get("disaster_flag", False))
        ml_score        = float(ml_data.get("ml_score", 20.0))
        final_score     = technical_score + sentiment_score + ml_score

        # ── 3. ML block ───────────────────────────────────────────────────
        if ml_score < active_ml_block:
            return self._build_decision(
                execute=False,
                reason=(
                    f"❌ ML too weak for aggressive"
                    f"{' [degraded]' if degraded else ''}"
                    f" ({ml_score:.0f} < {active_ml_block})"
                ),
                lots=1.0,
                technical_score=technical_score,
                sentiment_score=sentiment_score,
                ml_score=ml_score,
                final_score=final_score,
                disaster_flag=disaster_flag,
                strategy_name=self.NAME,
            )

        # ── 4. Disaster block ─────────────────────────────────────────────
        if disaster_flag:
            return self._build_decision(
                execute=False,
                reason="🚨 DISASTER — aggressive strategy halted",
                lots=1.0,
                technical_score=technical_score,
                sentiment_score=sentiment_score,
                ml_score=ml_score,
                final_score=final_score,
                disaster_flag=True,
                strategy_name=self.NAME,
            )

        # ── 5. Score threshold ────────────────────────────────────────────
        if final_score >= active_min_score:
            lots  = self.calculate_lot_size(ml_score, context)
            mode  = " [DEGRADED→balanced rules]" if degraded else ""
            label = (
                f"🚀 Aggressive entry — score {final_score:.1f}"
                f" | ML {ml_score:.0f}/40"
                f" | {lots}L"
                f"{mode}"
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

        # ── 6. Score too low ──────────────────────────────────────────────
        return self._build_decision(
            execute=False,
            reason=(
                f"❌ Score {final_score:.1f} below aggressive minimum"
                f" ({active_min_score})"
                f"{' [degraded]' if degraded else ''}"
            ),
            lots=1.0,
            technical_score=technical_score,
            sentiment_score=sentiment_score,
            ml_score=ml_score,
            final_score=final_score,
            disaster_flag=False,
            strategy_name=self.NAME,
        )