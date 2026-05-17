"""
Intent Engine Configuration
===========================

Configuration management for the Intent Engine layer.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel, Field


class GeminiConfig(BaseModel):
    """Gemini API configuration."""
    api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    model_name: str = Field(default="gemini-2.0-flash")
    temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    max_tokens: int = Field(default=512)
    timeout_seconds: int = Field(default=10)
    max_retries: int = Field(default=3)


class IntentEngineConfig(BaseModel):
    """Main configuration for Intent Engine."""
    gemini: GeminiConfig = Field(default_factory=GeminiConfig)
    latency_target_ms: float = Field(default=300.0)
    confidence_threshold_high: float = Field(default=0.8)
    confidence_threshold_low: float = Field(default=0.5)
    cache_enabled: bool = Field(default=True)
    cache_ttl_seconds: int = Field(default=300)


@dataclass
class ExtractionConfig:
    """Runtime configuration for intent extraction."""
    temperature: float = 0.1
    max_output_tokens: int = 512
    response_mime_type: str = "application/json"

    # Extraction prompts
    system_prompt: str = """You are an intent extraction engine for ARGUS.
Your task is to analyze user requests and extract structured authorization boundaries.
Be conservative when uncertain - it's better to deny an action than allow a harmful one."""

    extraction_template: str = """Extract the user's intent from their request.

User Request:
{user_input}

Return a structured JSON manifest with:
- declared_intent: primary intent category (customer_service, email_management, code_review, etc.)
- allowed_actions: list of action types explicitly authorized
- forbidden_actions: list of action types explicitly prohibited
- scope: boundaries/count limits
- risk_ceiling: maximum acceptable risk (0.0-1.0)
- constraints: any custom constraints

Available action types:
- read_email, write_reply, forward_email, delete_email, send_email
- read_file, write_file, delete_file, create_file, execute_code, query_database
- make_api_call, access_web, download_file, upload_file
- create_ticket, update_record, delete_record, grant_permission, revoke_permission
- read_patient_record, generate_discharge_summary, update_ehr, export_phi
- access_medication_records, forward_phi_external, bulk_export_records, delete_patient_record

Available intent categories:
- customer_service, email_management, code_review, data_analysis
- document_processing, scheduling, research, general_conversation, administrative, financial
- clinical_discharge, patient_record_access, healthcare_record_management, clinical_review

IMPORTANT:
- Be conservative with risk_ceiling (default 0.3 for unfamiliar tasks, 0.25 for healthcare tasks)
- If action is not explicitly allowed, add it to forbidden_actions
- For healthcare tasks, ALWAYS add export_phi, forward_phi_external, delete_patient_record to forbidden_actions
- Extract scope as specifically as possible
- Return ONLY valid JSON, no additional text"""

    @property
    def full_system_prompt(self) -> str:
        return f"{self.system_prompt}\n\n{self.extraction_template}"


def load_config() -> IntentEngineConfig:
    """Load configuration from environment and defaults."""
    return IntentEngineConfig(
        gemini=GeminiConfig(
            api_key=os.getenv("GEMINI_API_KEY", ""),
            model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            temperature=0.1,
            max_tokens=512,
            timeout_seconds=10,
            max_retries=3
        ),
        latency_target_ms=float(os.getenv("INTENT_LATENCY_TARGET_MS", "300")),
        confidence_threshold_high=0.8,
        confidence_threshold_low=0.5,
        cache_enabled=os.getenv("INTENT_CACHE_ENABLED", "true").lower() == "true",
        cache_ttl_seconds=int(os.getenv("INTENT_CACHE_TTL", "300"))
    )


# Global config instance
_config: Optional[IntentEngineConfig] = None


def get_config() -> IntentEngineConfig:
    """Get or create global configuration instance."""
    global _config
    if _config is None:
        _config = load_config()
    return _config


def get_extraction_config() -> ExtractionConfig:
    """Get extraction configuration for prompt generation."""
    return ExtractionConfig()