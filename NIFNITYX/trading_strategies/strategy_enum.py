"""
strategies/strategy_enum.py
────────────────────────────────────────────────
Enum-based strategy validation.
All strategy names are validated against this enum.
No dynamic code execution, no eval, no getattr tricks.
"""

from enum import Enum


class StrategyName(str, Enum):
    """
    Exhaustive list of valid strategy names.
    String enum so comparison with raw strings works seamlessly:
      StrategyName("sniper") == StrategyName.SNIPER  → True
    """
    SNIPER       = "sniper"
    BALANCED     = "balanced"
    AGGRESSIVE   = "aggressive"
    CONSERVATIVE = "conservative"

    @classmethod
    def from_string(cls, value: str) -> "StrategyName":
        """
        Parse a raw string into a StrategyName.
        Returns SNIPER (default) if value is invalid — never raises.
        """
        try:
            return cls(value.lower().strip())
        except (ValueError, AttributeError):
            print(f"⚠️  [StrategyFactory] Unknown strategy '{value}' — defaulting to SNIPER")
            return cls.SNIPER

    @classmethod
    def all_names(cls) -> list:
        return [e.value for e in cls]