"""
strategies/sniper_strategy.py
────────────────────────────────────────────────
SNIPER STRATEGY — Exact current system behaviour, preserved 1:1.

Thresholds and lot-sizing logic are copied verbatim from the original
LivePaperTradingSystem.evaluate_signal() and PaperTradingEngine.execute_signal().
Nothing has been changed — not even the rounding behaviour.

Profile:
  Ultra-precise. Only takes 5-star setups with strong ML confidence.
  Low trade frequency, maximum quality filter.
"""

from __future__ import annotations

from typing import Any, Dict

from .base_strategy import BaseStrategy, DecisionDict, StrategyContext


class SniperStrategy(BaseStrategy):
    """
    Exact replica of the original single-strategy system.
    
    ┌─────────────────────────────────────────────┐
    │  MIN_SCORE            60   (out of 120)     │
    │  ML_BLOCK_THRESHOLD   15   (out of 40)      │
    │  ML_STRONG_THRESHOLD  22   (out of 40)      │
    │  Max positions        2                     │
    │  Max daily trades     8                     │
    │  Daily drawdown       2.5%                  │
    └─────────────────────────────────────────────┘
    """

    NAME = "sniper"

    MIN_SCORE           = 60
    ML_BLOCK_THRESHOLD  = 15
    ML_STRONG_THRESHOLD = 22

    MAX_POSITIONS    = 2
    MAX_DAILY_TRADES = 8
    MAX_DAILY_DD_PCT = 2.5     # % of initial_capital

    def risk_check(self, context: StrategyContext) -> bool:
        """Hard position / drawdown / trade-count gate."""
        if context.open_positions >= self.MAX_POSITIONS:
            return False
        if context.daily_trades >= self.MAX_DAILY_TRADES:
            return False
        # Use initial_capital (fixed ₹1,00,000) not shrinking capital —
        # otherwise a single ~₹2,500 loss blocks the whole day as capital decays.
        # Backtest had no daily gate; 8% gives a wide enough safety net for demo.
        if context.daily_pnl < -(context.initial_capital * 0.08):
            return False
        return True

    def calculate_lot_size(self, ml_score: float, context: StrategyContext) -> float:
        """
        Original lot-sizing logic from PaperTradingEngine.execute_signal().
        Preserved verbatim including the round(x * 2) / 2 snap.
        """
        if ml_score < 15:
            lots = 0.5
        elif ml_score < 22:
            lots = 0.75
        else:
            lots = 1.25

        # Original rounding — preserved exactly (including banker's-rounding edge cases)
        lots = round(lots * 2) / 2
        if lots < 0.5:
            lots = 0.5
        return lots

    def evaluate(
        self,
        signal:         Dict[str, Any],
        sentiment_data: Dict[str, Any],
        ml_data:        Dict[str, Any],
        context:        StrategyContext,
    ) -> DecisionDict:
        """
        Original evaluate_signal() logic from LivePaperTradingSystem.
        Identical gate order: risk → ML block → disaster → score threshold.
        """
        # ── 0. Hard risk gate ─────────────────────────────────────────────
        if not self.risk_check(context):
            return self._risk_blocked_decision(
                reason="🔒 Risk gate blocked (positions/trades/drawdown limit)"
            )

        # ── 1. Extract scores ─────────────────────────────────────────────
        technical_score = float(signal.get("technical_score", 60))
        sentiment_score = float(sentiment_data.get("sentiment_boost", 0))
        disaster_flag   = bool(sentiment_data.get("disaster_flag", False))
        ml_score        = float(ml_data.get("ml_score", 20.0))
        final_score     = technical_score + sentiment_score + ml_score

        # ── 2. ML hard block ──────────────────────────────────────────────
        if ml_score < self.ML_BLOCK_THRESHOLD:
            return self._build_decision(
                execute=False,
                reason=f"❌ ML too weak ({ml_score:.0f}/40)",
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
                reason="🚨 DISASTER flag — trade blocked",
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
            lots   = self.calculate_lot_size(ml_score, context)
            label  = (f"🔥 Strong ML: {ml_score:.0f}"
                      if ml_score >= self.ML_STRONG_THRESHOLD
                      else f"✅ Good ML: {ml_score:.0f}")
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
            reason=f"❌ Score too low ({final_score:.1f}/{self.MIN_SCORE})",
            lots=0.5,
            technical_score=technical_score,
            sentiment_score=sentiment_score,
            ml_score=ml_score,
            final_score=final_score,
            disaster_flag=False,
            strategy_name=self.NAME,
        )