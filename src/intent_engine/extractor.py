"""
Intent Extractor
================

Core module for extracting user intent from natural language input
using Google Gemini Flash.

This is Layer 1 of the ARGUS architecture - the entry point that
converts raw user requests into structured Intent Manifests.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import time
from collections import OrderedDict
from typing import Optional

import httpx

from .config import get_config, get_extraction_config, IntentEngineConfig
from .models import (
    IntentManifest,
    IntentExtractionResult,
    IntentCategory,
    ActionType,
    create_conservative_manifest
)


class IntentCache:
    """LRU in-memory cache for intent extraction results."""

    def __init__(self, ttl_seconds: int = 300, max_size: int = 256):
        self._cache: OrderedDict[str, tuple[str, float]] = OrderedDict()
        self._ttl = ttl_seconds
        self._max_size = max_size

    def get(self, user_input: str) -> Optional[IntentManifest]:
        cache_key = self._make_key(user_input)
        entry = self._cache.get(cache_key)
        if entry is None:
            return None
        result_json, timestamp = entry
        if time.time() - timestamp < self._ttl:
            self._cache.move_to_end(cache_key)
            return IntentManifest.from_json(result_json)
        del self._cache[cache_key]
        return None

    def set(self, user_input: str, manifest: IntentManifest) -> None:
        cache_key = self._make_key(user_input)
        self._cache[cache_key] = (manifest.to_json(), time.time())
        self._cache.move_to_end(cache_key)
        if len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

    def _make_key(self, user_input: str) -> str:
        return hashlib.sha256(user_input.lower().strip().encode()).hexdigest()

    def clear(self) -> None:
        self._cache.clear()


class GeminiClient:
    """Async client for Gemini API calls."""

    def __init__(self, config: IntentEngineConfig):
        self.config = config
        self.gemini_config = config.gemini
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
        temperature: float = 0.1,
        max_tokens: int = 512
    ) -> str:
        """
        Call Gemini API to generate content.

        Args:
            prompt: The prompt to send to Gemini
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens in response

        Returns:
            Raw text response from Gemini

        Raises:
            RuntimeError: If API call fails
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
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json"
            }
        }

        for attempt in range(self.gemini_config.max_retries):
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()

                result = response.json()

                # Extract text from response
                if "candidates" in result and len(result["candidates"]) > 0:
                    candidate = result["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]

                raise RuntimeError("Unexpected Gemini response format")

            except httpx.HTTPError as e:
                if attempt < self.gemini_config.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                raise RuntimeError(f"Gemini API call failed after {self.gemini_config.max_retries} retries")


class IntentExtractor:
    """
    Main intent extraction engine.

    Processes user input and generates structured Intent Manifests
    using Gemini Flash for low-latency extraction (<300ms target).
    """

    def __init__(self, config: Optional[IntentEngineConfig] = None):
        self.config = config or get_config()
        self.extraction_config = get_extraction_config()
        self.gemini = GeminiClient(self.config)
        self.cache = IntentCache(ttl_seconds=self.config.cache_ttl_seconds)

    async def close(self) -> None:
        """Close resources."""
        await self.gemini.close()

    async def extract_intent(
        self,
        user_input: str,
        session_id: str,
        user_id: Optional[str] = None
    ) -> IntentExtractionResult:
        """
        Extract user intent from natural language input.

        Args:
            user_input: Raw user request (e.g., "Handle today's complaint emails")
            session_id: Unique session identifier
            user_id: Optional user identifier

        Returns:
            IntentExtractionResult containing manifest and metadata

        Latency target: <300ms end-to-end
        """
        start_time = time.time()
        warnings = []

        # Check cache first
        if self.config.cache_enabled:
            cached_manifest = self.cache.get(user_input)
            if cached_manifest:
                return IntentExtractionResult(
                    manifest=cached_manifest,
                    confidence=1.0,
                    extraction_time_ms=0.0,
                    raw_model_output="[cached]",
                    warnings=["Result retrieved from cache"],
                    fallback_used=False
                )

        # Generate extraction prompt
        prompt = self.extraction_config.full_system_prompt.format(
            user_input=user_input
        )

        try:
            # Call Gemini
            raw_output = await self.gemini.generate_content(
                prompt=prompt,
                temperature=self.extraction_config.temperature,
                max_tokens=self.extraction_config.max_output_tokens
            )

            # Parse JSON response
            try:
                extracted_data = json.loads(raw_output)
            except json.JSONDecodeError as e:
                warnings.append(f"JSON parse failed, attempting to extract: {e}")
                extracted_data = self._extract_json_fallback(raw_output)
                if extracted_data is None:
                    raise ValueError("Failed to extract JSON from model output")

            # Build manifest
            manifest = self._build_manifest(
                extracted_data=extracted_data,
                session_id=session_id,
                user_id=user_id
            )

            # Estimate confidence based on data quality
            confidence = self._estimate_confidence(extracted_data, warnings)

            # Cache result
            if self.config.cache_enabled:
                self.cache.set(user_input, manifest)

            extraction_time = (time.time() - start_time) * 1000

            return IntentExtractionResult(
                manifest=manifest,
                confidence=confidence,
                extraction_time_ms=extraction_time,
                raw_model_output=raw_output,
                warnings=warnings,
                fallback_used=False
            )

        except Exception as e:
            # Fail-secure: return conservative manifest on any error
            warnings.append("Extraction failed — using conservative fallback")

            manifest = create_conservative_manifest(session_id)
            extraction_time = (time.time() - start_time) * 1000

            return IntentExtractionResult(
                manifest=manifest,
                confidence=0.0,
                extraction_time_ms=extraction_time,
                raw_model_output=None,
                warnings=warnings,
                fallback_used=True
            )

    def _repair_json(self, text: str) -> Optional[str]:
        """Attempt to repair common JSON truncation issues."""
        text = text.strip()
        if not text:
            return None

        stack = []
        in_string = False
        escaped = False
        for i, ch in enumerate(text):
            if escaped:
                escaped = False
                continue
            if ch == '\\':
                escaped = True
                continue
            if ch == '"' and not escaped:
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch in '{[':
                stack.append(ch)
            elif ch == '}':
                if stack and stack[-1] == '{':
                    stack.pop()
            elif ch == ']':
                if stack and stack[-1] == '[':
                    stack.pop()

        # Close unterminated string
        if in_string:
            text += '"'

        # Close unclosed brackets in reverse order
        for bracket in reversed(stack):
            text += '}' if bracket == '{' else ']'

        # Remove trailing commas before } or ]
        import re
        text = re.sub(r',\s*([}\]])', r'\1', text)

        return text

    def _extract_json_fallback(self, raw_output: str) -> Optional[dict]:
        """Attempt to extract JSON from non-standard output, with repair."""
        start_idx = raw_output.find("{")
        if start_idx == -1:
            return None

        # Extract from opening brace to end — no closing brace required
        json_str = raw_output[start_idx:]

        # Strip trailing non-JSON content
        end_idx = json_str.rfind("}")
        if end_idx != -1:
            json_str = json_str[:end_idx + 1]

        # Try direct parse first
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        # Attempt repair
        repaired = self._repair_json(json_str)
        if repaired:
            try:
                return json.loads(repaired)
            except json.JSONDecodeError:
                pass

        return None

    def _build_manifest(
        self,
        extracted_data: dict,
        session_id: str,
        user_id: Optional[str]
    ) -> IntentManifest:
        """
        Build IntentManifest from extracted data.

        Applies sensible defaults and handles missing fields.
        """
        # Map string values to enums
        declared_intent = IntentCategory.UNKNOWN
        if "declared_intent" in extracted_data:
            try:
                declared_intent = IntentCategory(extracted_data["declared_intent"])
            except ValueError:
                pass

        # Convert action strings to enums
        allowed_actions = []
        if "allowed_actions" in extracted_data:
            for action in extracted_data["allowed_actions"]:
                try:
                    allowed_actions.append(ActionType(action))
                except ValueError:
                    pass

        forbidden_actions = []
        if "forbidden_actions" in extracted_data:
            for action in extracted_data["forbidden_actions"]:
                try:
                    forbidden_actions.append(ActionType(action))
                except ValueError:
                    pass

        # Build manifest with defaults
        return IntentManifest(
            declared_intent=declared_intent,
            allowed_actions=allowed_actions,
            forbidden_actions=forbidden_actions,
            scope=extracted_data.get("scope", ""),
            constraints=extracted_data.get("constraints", []),
            risk_ceiling=float(extracted_data.get("risk_ceiling", 0.3)),
            session_id=session_id,
            user_id=user_id,
            context=extracted_data.get("context", {})
        )

    def _estimate_confidence(
        self,
        extracted_data: dict,
        warnings: list[str]
    ) -> float:
        """
        Estimate confidence of extraction based on data quality.

        Factors:
        - All required fields present
        - Intent category is valid
        - Actions are valid
        - No warnings
        """
        base_confidence = 0.5

        # Required field present
        if "declared_intent" in extracted_data:
            base_confidence += 0.15

        # Actions present
        if "allowed_actions" in extracted_data and extracted_data["allowed_actions"]:
            base_confidence += 0.15

        # Scope specified
        if "scope" in extracted_data and extracted_data["scope"]:
            base_confidence += 0.1

        # Risk ceiling specified
        if "risk_ceiling" in extracted_data:
            base_confidence += 0.1

        # No warnings
        if not warnings:
            base_confidence += 0.1

        return min(base_confidence, 1.0)


# Synchronous wrapper for non-async contexts
class SyncIntentExtractor:
    """Synchronous wrapper for IntentExtractor. Owns its own event loop."""

    def __init__(self, config: Optional[IntentEngineConfig] = None):
        self._async_extractor = IntentExtractor(config)
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def _get_loop(self) -> asyncio.AbstractEventLoop:
        if self._loop is None or self._loop.is_closed():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
        return self._loop

    def extract_intent(
        self,
        user_input: str,
        session_id: str,
        user_id: Optional[str] = None
    ) -> IntentExtractionResult:
        loop = self._get_loop()
        return loop.run_until_complete(
            self._async_extractor.extract_intent(user_input, session_id, user_id)
        )

    def close(self) -> None:
        if self._loop and not self._loop.is_closed():
            self._loop.close()
        self._loop = None