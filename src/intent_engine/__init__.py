"""
Intent Engine Module
====================

Layer 1 of ARGUS architecture - extracts user intent from natural language
and generates structured Intent Manifests for authorization decisions.
"""

from .config import IntentEngineConfig, get_config, get_extraction_config
from .extractor import IntentCache, IntentExtractor, SyncIntentExtractor
from .models import (
    ActionType,
    IntentCategory,
    IntentExtractionResult,
    IntentManifest,
    RiskLevel,
    create_conservative_manifest,
)

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
