"""
Intent Engine Module
====================

Layer 1 of ARGUS architecture - extracts user intent from natural language
and generates structured Intent Manifests for authorization decisions.
"""

from .models import (
    IntentManifest,
    IntentExtractionResult,
    IntentCategory,
    ActionType,
    RiskLevel,
    create_conservative_manifest
)

from .extractor import IntentExtractor, SyncIntentExtractor, IntentCache
from .config import get_config, get_extraction_config, IntentEngineConfig

__all__ = [
    # Models
    "IntentManifest",
    "IntentExtractionResult",
    "IntentCategory",
    "ActionType",
    "RiskLevel",
    "create_conservative_manifest",
    # Extractors
    "IntentExtractor",
    "SyncIntentExtractor",
    "IntentCache",
    # Config
    "get_config",
    "get_extraction_config",
    "IntentEngineConfig",
]