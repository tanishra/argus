"""
Explanation Engine
=================

Layer 3 of ARGUS architecture - generates human-readable explanations
for intent-action mismatches using Gemini Pro deep reasoning.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import httpx

from .config import get_config, get_prompt_config, ExplanationEngineConfig
from ..intent_engine.models import IntentManifest
from ..lobster_proxy.engine import DetectedAction, PolicyEvaluation


@dataclass
class MismatchExplanation:
    """
    Structured explanation for an intent-action mismatch.

    Contains all the information needed for security analysts
    to make informed decisions about quarantined actions.
    """
    summary: str = field(default="")
    detailed_reason: str = field(default="")
    risk_description: str = field(default="")
    user_authorization_summary: str = field(default="")
    recommended_action: str = field(default="")  # APPROVE, DENY, ESCALATE
    remediation_suggestions: list[str] = field(default_factory=list)
    confidence: float = 0.0
    generation_time_ms: float = 0.0
    raw_model_output: Optional[str] = None


class GeminiProClient:
    """Async client for Gemini Pro API calls."""

    def __init__(self, config: ExplanationEngineConfig):
        self.config = config
        self.gemini_config = config.gemini_pro
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.gemini_config.timeout_seconds)
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def generate_content(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1024
    ) -> str:
        """
        Call Gemini Pro API to generate explanation.

        Args:
            prompt: The prompt to send to Gemini Pro
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens in response

        Returns:
            Raw text response from Gemini Pro
        """
        client = await self._get_client()

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_config.model_name}:generateContent"
        headers = {"x-goog-api-key": self.gemini_config.api_key}

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }

        for attempt in range(self.gemini_config.max_retries):
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()

                result = response.json()

                if "candidates" in result and len(result["candidates"]) > 0:
                    candidate = result["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]

                raise RuntimeError("Unexpected Gemini Pro response format")

            except httpx.HTTPError as e:
                if attempt < self.gemini_config.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f"Gemini Pro API call failed after {self.gemini_config.max_retries} attempts")


logger = logging.getLogger("argus.explanation_engine")

class ExplanationEngine:
    """
    Main explanation generation engine.

    Uses Gemini Pro for deep semantic analysis of intent-action mismatches
    to provide clear, actionable explanations for security analysts.
    """

    def __init__(self, config: Optional[ExplanationEngineConfig] = None):
        self.config = config or get_config()
        self.prompt_config = get_prompt_config()
        self.gemini = GeminiProClient(self.config)

    async def close(self) -> None:
        """Close resources."""
        await self.gemini.close()

    async def explain_mismatch(
        self,
        manifest: IntentManifest,
        detected_action: DetectedAction,
        evaluation: PolicyEvaluation
    ) -> MismatchExplanation:
        """
        Generate explanation for an intent-action mismatch.

        Args:
            manifest: The declared intent manifest
            detected_action: The detected action from agent
            evaluation: The policy evaluation result

        Returns:
            MismatchExplanation with structured breakdown
        """
        start_time = time.time()

        # If no mismatches, provide simple confirmation
        if not evaluation.mismatches:
            return MismatchExplanation(
                summary="Action aligns with declared intent",
                detailed_reason="No discrepancies found between declared intent and detected action.",
                risk_description="Low risk - action within authorized boundaries.",
                user_authorization_summary=self._summarize_authorization(manifest),
                recommended_action="APPROVE",
                confidence=1.0,
                generation_time_ms=0.0
            )

        try:
            # Generate detailed explanation using Gemini Pro
            prompt = self._build_mismatch_prompt(manifest, detected_action, evaluation)

            raw_output = await self.gemini.generate_content(
                prompt=prompt,
                temperature=self.prompt_config.temperature,
                max_tokens=self.prompt_config.max_output_tokens
            )

            # Parse structured response
            explanation = self._parse_explanation_response(
                raw_output=raw_output,
                manifest=manifest,
                evaluation=evaluation
            )

            explanation.raw_model_output = raw_output

        except Exception as e:
            # Fallback to simple explanation
            explanation = self._generate_fallback_explanation(
                manifest=manifest,
                detected_action=detected_action,
                evaluation=evaluation,
                error=str(e)
            )

        explanation.generation_time_ms = (time.time() - start_time) * 1000

        return explanation

    def _build_mismatch_prompt(
        self,
        manifest: IntentManifest,
        detected_action: DetectedAction,
        evaluation: PolicyEvaluation
    ) -> str:
        """Build prompt for mismatch explanation generation."""
        mismatches_text = "\n".join([f"- {m}" for m in evaluation.mismatches])

        risk_indicators = ", ".join(detected_action.risk_indicators) or "none"
        injection_patterns = ", ".join(detected_action.injection_patterns) or "none"
        exfil_signals = ", ".join(detected_action.exfiltration_signals) or "none"

        return self.prompt_config.mismatch_template.format(
            intent=manifest.declared_intent.value,
            allowed_actions=", ".join([a.value for a in manifest.allowed_actions]) or "none",
            forbidden_actions=", ".join([a.value for a in manifest.forbidden_actions]) or "none",
            scope=manifest.scope or "unspecified",
            risk_ceiling=manifest.risk_ceiling,
            action_type=detected_action.action_type.value,
            target=detected_action.target,
            risk_indicators=risk_indicators,
            injection_patterns=injection_patterns,
            exfiltration_signals=exfil_signals,
            mismatches=mismatches_text,
            risk_score=f"{evaluation.risk_score:.2f}"
        )

    def _parse_explanation_response(
        self,
        raw_output: str,
        manifest: IntentManifest,
        evaluation: PolicyEvaluation
    ) -> MismatchExplanation:
        """
        Parse structured explanation from Gemini Pro response.

        Handles various response formats and extracts key sections.
        """
        # Try to find JSON in response
        try:
            start_idx = raw_output.find("{")
            end_idx = raw_output.rfind("}")
            if start_idx != -1 and end_idx != -1:
                json_str = raw_output[start_idx:end_idx + 1]
                data = json.loads(json_str)
                return MismatchExplanation(
                    summary=data.get("summary", "Mismatch detected"),
                    detailed_reason=data.get("detailed_reason", raw_output),
                    risk_description=data.get("risk_description", ""),
                    user_authorization_summary=data.get("user_authorization", ""),
                    recommended_action=data.get("recommended_action", "DENY"),
                    remediation_suggestions=data.get("remediation", []),
                    confidence=data.get("confidence", 0.8)
                )
        except json.JSONDecodeError:
            pass

        # Fallback: parse as structured text
        return self._parse_text_response(raw_output, manifest, evaluation)

    def _parse_text_response(
        self,
        raw_output: str,
        manifest: IntentManifest,
        evaluation: PolicyEvaluation
    ) -> MismatchExplanation:
        """Parse explanation from unstructured text response."""
        lines = raw_output.split("\n")

        # Simple parsing heuristics
        summary = lines[0] if lines else "Mismatch detected"
        reasoning_parts = []
        recommendations = []

        for line in lines:
            line_lower = line.lower()
            if "mismatch" in line_lower or "detected" in line_lower:
                reasoning_parts.append(line)
            if "recommend" in line_lower or "action" in line_lower:
                recommendations.append(line)

        return MismatchExplanation(
            summary=summary,
            detailed_reason=" ".join(reasoning_parts[:3]) if reasoning_parts else raw_output[:500],
            risk_description=f"Risk score: {evaluation.risk_score:.2f} ({evaluation.risk_level.value})",
            user_authorization_summary=self._summarize_authorization(manifest),
            recommended_action=self._extract_recommendation(recommendations),
            remediation_suggestions=["Review action details", "Contact user for clarification"],
            confidence=0.6
        )

    def _generate_fallback_explanation(
        self,
        manifest: IntentManifest,
        detected_action: DetectedAction,
        evaluation: PolicyEvaluation,
        error: str
    ) -> MismatchExplanation:
        """Generate fallback explanation when Gemini Pro fails."""
        logger.warning("Falling back to template explanation. Gemini error: %s", error)
        return MismatchExplanation(
            summary=f"Intent mismatch: {detected_action.action_type.value} not authorized",
            detailed_reason=f"The detected action '{detected_action.action_type.value}' targeting '{detected_action.target}' does not match the declared intent '{manifest.declared_intent.value}'. This may indicate a prompt injection attack or unauthorized action attempt.",
            risk_description=f"Risk score {evaluation.risk_score:.2f} exceeds acceptable threshold ({manifest.risk_ceiling}). Action requires human review.",
            user_authorization_summary=self._summarize_authorization(manifest),
            recommended_action="DENY",
            remediation_suggestions=[
                "Verify user's original intent",
                "Check for prompt injection in recent inputs",
                "Report to security team if attack suspected"
            ],
            confidence=0.5
        )

    def _summarize_authorization(self, manifest: IntentManifest) -> str:
        """Create brief summary of what user authorized."""
        allowed = ", ".join([a.value for a in manifest.allowed_actions[:3]])
        if len(manifest.allowed_actions) > 3:
            allowed += "..."
        return f"Intent: {manifest.declared_intent.value}, Allowed: [{allowed}], Scope: {manifest.scope or 'unrestricted'}"

    def _extract_recommendation(self, recommendation_lines: list[str]) -> str:
        """Extract recommended action from text."""
        if not recommendation_lines:
            return "ESCALATE"

        text = " ".join(recommendation_lines).lower()
        if "deny" in text or "block" in text:
            return "DENY"
        if "approve" in text or "allow" in text:
            return "APPROVE"
        return "ESCALATE"

    async def explain_simple(
        self,
        action_type: str,
        target: str,
        intent: str,
        risk_score: float,
        reason: str
    ) -> str:
        """
        Generate simple one-line explanation for quick dashboard display.

        Used for real-time dashboard updates where deep analysis isn't needed.
        """
        prompt = self.prompt_config.simple_template.format(
            action_type=action_type,
            target=target,
            intent=intent,
            risk_score=risk_score,
            reason=reason
        )

        try:
            return await self.gemini.generate_content(
                prompt=prompt,
                temperature=0.2,
                max_tokens=256
            )
        except Exception:
            logger.warning("Fallback to template explanation for '%s' on '%s'", action_type, target)
            return f"Action '{action_type}' targeting '{target}' flagged: {reason}"


class SyncExplanationEngine:
    """Synchronous wrapper for ExplanationEngine. Owns its own event loop."""

    def __init__(self, config: Optional[ExplanationEngineConfig] = None):
        self._async_engine = ExplanationEngine(config)
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def _get_loop(self) -> asyncio.AbstractEventLoop:
        if self._loop is None or self._loop.is_closed():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
        return self._loop

    def explain_mismatch(
        self,
        manifest: IntentManifest,
        detected_action: DetectedAction,
        evaluation: PolicyEvaluation
    ) -> MismatchExplanation:
        """Synchronously explain mismatch."""
        loop = self._get_loop()
        return loop.run_until_complete(
            self._async_engine.explain_mismatch(manifest, detected_action, evaluation)
        )

    def close(self) -> None:
        """Close the async engine and the dedicated event loop."""
        if self._loop and not self._loop.is_closed():
            try:
                self._loop.run_until_complete(self._async_engine.close())
            finally:
                self._loop.close()
                self._loop = None