"""
Lobster Trap Module
===================

Layer 2 of ARGUS architecture - policy enforcement engine
that compares declared intent against detected action metadata.
"""

from .engine import (
    Decision,
    DetectedAction,
    LobsterTrapEngine,
    LobsterTrapProxy,
    PolicyEvaluation,
    RiskThreshold,
    get_proxy,
)

__all__ = [
    "LobsterTrapEngine",
    "LobsterTrapProxy",
    "DetectedAction",
    "PolicyEvaluation",
    "Decision",
    "RiskThreshold",
    "get_proxy",
]
