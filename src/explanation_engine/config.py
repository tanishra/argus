"""
Explanation Engine Configuration
================================

Configuration for the Explanation Engine layer using Gemini Pro.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel, Field


class GeminiProConfig(BaseModel):
    """Gemini Pro API configuration."""

    api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    model_name: str = Field(default="gemini-2.5-pro")
    temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    max_tokens: int = Field(default=8192)
    timeout_seconds: int = Field(default=60)
    max_retries: int = Field(default=3)


class ExplanationEngineConfig(BaseModel):
    """Main configuration for Explanation Engine."""

    gemini_pro: GeminiProConfig = Field(default_factory=GeminiProConfig)
    latency_target_ms: float = Field(default=2000.0)
    enable_deep_analysis: bool = Field(default=True)
    include_remediation_suggestions: bool = Field(default=True)


@dataclass
class ExplanationPromptConfig:
    """Configuration for explanation generation prompts."""

    temperature: float = 0.3
    max_output_tokens: int = 8192

    system_prompt: str = """You are ARGUS's Explanation Engine. Your role is to analyze
intent-action mismatches and provide clear, actionable explanations for security analysts.

Focus on:
1. Why the action was flagged (specific mismatch)
2. What risk it poses (concrete consequence)
3. What the user actually authorized (scope boundary)
4. Recommended next steps (if human review needed)

Be concise but thorough. Use plain language, not security jargon."""

    mismatch_template: str = """\
Analyze the following intent-action mismatch and provide an explanation.

DECLARED INTENT:
- Intent: {intent}
- Allowed Actions: {allowed_actions}
- Forbidden Actions: {forbidden_actions}
- Scope: {scope}
- Risk Ceiling: {risk_ceiling}

DETECTED ACTION:
- Action Type: {action_type}
- Target: {target}
- Risk Indicators: {risk_indicators}
- Injection Patterns: {injection_patterns}
- Exfiltration Signals: {exfiltration_signals}

MISMATCHES FOUND:
{mismatches}

RISK SCORE: {risk_score}

Generate a clear explanation covering:
1. The specific mismatch(s) detected
2. Why this poses a risk
3. What the user originally authorized
4. Recommended action (approve/deny/escalate)
5. Any remediation suggestions"""

    simple_template: str = """Explain why the following action was flagged.

Action: {action_type} targeting {target}
Intent: {intent}
Risk Score: {risk_score}
Reason: {reason}

Provide a brief, clear explanation."""

    @property
    def full_system_prompt(self) -> str:
        return self.system_prompt


def load_config() -> ExplanationEngineConfig:
    """Load configuration from environment and defaults."""
    return ExplanationEngineConfig(
        gemini_pro=GeminiProConfig(
            api_key=os.getenv("GEMINI_API_KEY", ""),
            model_name=os.getenv("GEMINI_PRO_MODEL", "gemini-2.5-pro"),
            temperature=0.3,
            max_tokens=8192,
            timeout_seconds=60,
            max_retries=3,
        ),
        latency_target_ms=float(os.getenv("EXPLANATION_LATENCY_TARGET_MS", "2000")),
        enable_deep_analysis=os.getenv("ENABLE_DEEP_ANALYSIS", "true").lower() == "true",
        include_remediation_suggestions=os.getenv("INCLUDE_REMEDIATION", "true").lower() == "true",
    )


# Global config instance
_config: Optional[ExplanationEngineConfig] = None


def get_config() -> ExplanationEngineConfig:
    """Get or create global configuration instance."""
    global _config
    if _config is None:
        _config = load_config()
    return _config


def get_prompt_config() -> ExplanationPromptConfig:
    """Get prompt configuration for explanation generation."""
    return ExplanationPromptConfig()
