"""
Explanation Engine Module
========================

Layer 3B of ARGUS architecture - generates human-readable explanations
for intent-action mismatches using Gemini Pro.
"""

from .engine import (
    ExplanationEngine,
    SyncExplanationEngine,
    MismatchExplanation
)

from .config import get_config, get_prompt_config, ExplanationEngineConfig

__all__ = [
    # Engine
    "ExplanationEngine",
    "SyncExplanationEngine",
    "MismatchExplanation",
    # Config
    "get_config",
    "get_prompt_config",
    "ExplanationEngineConfig"
]