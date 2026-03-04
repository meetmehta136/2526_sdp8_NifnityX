"""
strategies/factory.py
────────────────────────────────────────────────
StrategyFactory — single creation point for all strategies.

Security guarantees:
  • All names validated against StrategyName enum before any object is created
  • No eval(), no exec(), no getattr() tricks
  • No dynamic import of arbitrary modules
  • Unknown name → SNIPER (safe default), never crashes

Usage:
    strategy = StrategyFactory.create("balanced")
    strategy = StrategyFactory.create("AGGRESSIVE")    # case-insensitive
    strategy = StrategyFactory.create("garbage_name")  # → SniperStrategy + warning
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .base_strategy import BaseStrategy
from .strategy_enum import StrategyName

# Concrete strategy imports
from .sniper_strategy       import SniperStrategy
from .balanced_strategy     import BalancedStrategy
from .aggressive_strategy   import AggressiveStrategy
from .conservative_strategy import ConservativeStrategy


# ── Explicit dispatch table (no dynamic lookups) ──────────────────────────────
_REGISTRY: dict[StrategyName, type[BaseStrategy]] = {
    StrategyName.SNIPER:       SniperStrategy,
    StrategyName.BALANCED:     BalancedStrategy,
    StrategyName.AGGRESSIVE:   AggressiveStrategy,
    StrategyName.CONSERVATIVE: ConservativeStrategy,
}


class StrategyFactory:
    """
    Static factory.  No instantiation needed — call StrategyFactory.create().
    """

    @staticmethod
    def create(name: str | StrategyName) -> BaseStrategy:
        """
        Create and return a strategy instance.

        Args:
            name: Strategy name as string (case-insensitive) or StrategyName enum.

        Returns:
            Concrete BaseStrategy subclass instance.
            Always returns a valid strategy — never raises.

        Examples:
            StrategyFactory.create("sniper")       → SniperStrategy()
            StrategyFactory.create("BALANCED")     → BalancedStrategy()
            StrategyFactory.create("unknown")      → SniperStrategy() + warning
        """
        validated = (
            name if isinstance(name, StrategyName)
            else StrategyName.from_string(str(name))
        )

        strategy_class = _REGISTRY[validated]
        instance       = strategy_class()

        print(f"🎯 StrategyFactory: loaded [{validated.value.upper()}] → {strategy_class.__name__}")
        return instance

    @staticmethod
    def available() -> list[str]:
        """Return a list of all valid strategy names (for API endpoints)."""
        return StrategyName.all_names()

    @staticmethod
    def is_valid(name: str) -> bool:
        """Check if a name is a valid strategy without creating an instance."""
        try:
            StrategyName(name.lower().strip())
            return True
        except (ValueError, AttributeError):
            return False