"""
strategies/
────────────────────────────────────────────────
Multi-strategy package for the NifnityX 3-layer trading system.

Public API:
    from strategies import StrategyFactory, StrategyContext, StrategyName

    strategy = StrategyFactory.create("balanced")
    context  = StrategyContext(...)
    decision = strategy.evaluate(signal, sentiment_data, ml_data, context)
"""

from .base_strategy   import BaseStrategy, StrategyContext, DecisionDict
from .strategy_enum   import StrategyName
from .factory         import StrategyFactory

from .sniper_strategy       import SniperStrategy
from .balanced_strategy     import BalancedStrategy
from .aggressive_strategy   import AggressiveStrategy
from .conservative_strategy import ConservativeStrategy

__all__ = [
    "BaseStrategy",
    "StrategyContext",
    "DecisionDict",
    "StrategyName",
    "StrategyFactory",
    "SniperStrategy",
    "BalancedStrategy",
    "AggressiveStrategy",
    "ConservativeStrategy",
]