"""
strategies/balanced_strategy.py
────────────────────────────────────────────────
BALANCED STRATEGY

Equal weight on trend and mean-reversion signals.
Higher score threshold than Aggressive but lower than Conservative.
Adds a loss-streak lot reducer as the key risk management twist.

Profile:
  Steady, consistent trading. Good for normal market conditions.
  Penalises consecutive losses by reducing size — protects capital
  without disabling trading entirely.

┌─────────────────────────────────────────────┐
│  MIN_SCORE            65   (out of 120)     │
│  ML_BLOCK_THRESHOLD   18   (out of 40)      │
│  ML_MEDIUM_THRESHOLD  25   (out of 40)      │
│  Lot tiers        0.75 / 1.0 / 1.25        │
│  Max positions        2                     │
│  Max daily trades     3                     │
│  Daily drawdown       2.0%                  │
│  After 2 daily losses → -0.25 lot penalty  │
└─────────────────────────────────────────────┘
"""

from __future__ import annotations

from typing import Any, Dict

from .base_strategy import BaseStrategy, DecisionDict, StrategyContext


class BalancedStrategy(BaseStrategy):

    NAME = "balanced"

    MIN_SCORE            = 65
    ML_BLOCK_THRESHOLD   = 18
    ML_MEDIUM_THRESHOLD  = 25

    MAX_POSITIONS    = 2
    MAX_DAILY_TRADES = 3
    MAX_DAILY_DD_PCT = 2.0      # % of initial_capital

    # Loss-streak penalty trigger (within the same trading day)
    DAILY_LOSS_PENALTY_TRIGGER = 2   # After 2 daily losses, reduce lot size
    LOT_PENALTY                = 0.25

    def risk_check(self, context: StrategyContext) -> bool:
        """
        Gate order (fail-fast):
          1. Daily drawdown cap
          2. Open position cap
          3. Daily trade cap
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
        Three-tier ML-based sizing with a daily-loss penalty.

        Tier logic:
          ML < 18  → 0.75 lots  (cautious on weak signals)
          ML < 25  → 1.00 lots  (standard)
          ML ≥ 25  → 1.25 lots  (reward strong confidence)

        Penalty: after DAILY_LOSS_PENALTY_TRIGGER losses today,
                 subtract 0.25 from final size (floor 0.5).
        """
        if ml_score < self.ML_BLOCK_THRESHOLD:
            base_lots = 0.75
        elif ml_score < self.ML_MEDIUM_THRESHOLD:
            base_lots = 1.0
        else:
            base_lots = 1.25

        # Apply daily loss penalty — smart risk reduction without shutting down
        if context.daily_losses >= self.DAILY_LOSS_PENALTY_TRIGGER:
            base_lots = max(0.5, base_lots - self.LOT_PENALTY)

        return base_lots

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
                reason="🔒 Risk gate blocked (drawdown/positions/trades limit)"
            )

        # ── 1. Scores ─────────────────────────────────────────────────────
        technical_score = float(signal.get("technical_score", 60))
        sentiment_score = float(sentiment_data.get("sentiment_boost", 0))
        disaster_flag   = bool(sentiment_data.get("disaster_flag", False))
        ml_score        = float(ml_data.get("ml_score", 20.0))
        final_score     = technical_score + sentiment_score + ml_score

        # ── 2. ML block ───────────────────────────────────────────────────
        if ml_score < self.ML_BLOCK_THRESHOLD:
            return self._build_decision(
                execute=False,
                reason=f"❌ ML below balanced threshold ({ml_score:.0f} < {self.ML_BLOCK_THRESHOLD})",
                lots=0.75,
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
                reason="🚨 DISASTER flag — balanced strategy sitting out",
                lots=0.75,
                technical_score=technical_score,
                sentiment_score=sentiment_score,
                ml_score=ml_score,
                final_score=final_score,
                disaster_flag=True,
                strategy_name=self.NAME,
            )

        # ── 4. Score threshold ────────────────────────────────────────────
        if final_score >= self.MIN_SCORE:
            lots = self.calculate_lot_size(ml_score, context)

            penalty_note = ""
            if context.daily_losses >= self.DAILY_LOSS_PENALTY_TRIGGER:
                penalty_note = f" [⚠️ {context.daily_losses} daily losses → lot reduced]"

            label = (
                f"✅ Balanced entry — score {final_score:.1f}"
                f" | ML {ml_score:.0f}/40"
                f"{penalty_note}"
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
            reason=f"❌ Score {final_score:.1f} below balanced minimum ({self.MIN_SCORE})",
            lots=0.75,
            technical_score=technical_score,
            sentiment_score=sentiment_score,
            ml_score=ml_score,
            final_score=final_score,
            disaster_flag=False,
            strategy_name=self.NAME,
        )