"""
Tests for Intent Extractor
==========================

Unit tests for the IntentExtractor class.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from src.intent_engine.extractor import (
    IntentExtractor,
    SyncIntentExtractor,
    IntentCache
)
from src.intent_engine.config import IntentEngineConfig, GeminiConfig
from src.intent_engine.models import (
    IntentManifest,
    IntentExtractionResult,
    IntentCategory,
    ActionType
)


class TestIntentCache:
    """Tests for IntentCache."""

    def test_cache_store_and_retrieve(self):
        """Test storing and retrieving from cache."""
        cache = IntentCache(ttl_seconds=300)

        manifest = IntentManifest(
            declared_intent=IntentCategory.EMAIL_MANAGEMENT,
            session_id="cache_test"
        )

        cache.set("Handle complaint emails", manifest)
        cached = cache.get("Handle complaint emails")

        assert cached is not None
        assert cached.declared_intent == IntentCategory.EMAIL_MANAGEMENT

    def test_cache_miss(self):
        """Test cache miss returns None."""
        cache = IntentCache(ttl_seconds=300)
        result = cache.get("Non-existent input")
        assert result is None

    def test_cache_key_normalization(self):
        """Test that cache keys are normalized (case, whitespace)."""
        cache = IntentCache(ttl_seconds=300)

        manifest = IntentManifest(
            declared_intent=IntentCategory.CUSTOMER_SERVICE,
            session_id="key_test"
        )

        # Different cases should hit same cache entry
        cache.set("handle complaint emails", manifest)
        assert cache.get("Handle Complaint Emails") is not None
        assert cache.get("  handle  complaint  emails  ") is not None

    def test_cache_expiry(self):
        """Test cache expiration."""
        cache = IntentCache(ttl_seconds=0)  # Immediate expiry

        manifest = IntentManifest(
            declared_intent=IntentCategory.EMAIL_MANAGEMENT,
            session_id="expiry_test"
        )

        cache.set("Test input", manifest)
        result = cache.get("Test input")

        # Should be expired
        assert result is None

    def test_cache_clear(self):
        """Test clearing cache."""
        cache = IntentCache(ttl_seconds=300)

        manifest = IntentManifest(
            declared_intent=IntentCategory.GENERAL_CONVERSATION,
            session_id="clear_test"
        )

        cache.set("Test", manifest)
        assert cache.get("Test") is not None

        cache.clear()
        assert cache.get("Test") is None


class TestIntentExtractor:
    """Tests for IntentExtractor."""

    @pytest.fixture
    def mock_config(self):
        """Create mock configuration."""
        return IntentEngineConfig(
            gemini=GeminiConfig(
                api_key="test_key",
                model_name="gemini-2.0-flash",
                temperature=0.1,
                max_tokens=512,
                timeout_seconds=10,
                max_retries=3
            ),
            latency_target_ms=300.0,
            confidence_threshold_high=0.8,
            confidence_threshold_low=0.5,
            cache_enabled=False
        )

    @pytest.mark.asyncio
    async def test_extract_intent_success(self, mock_config):
        """Test successful intent extraction."""
        extractor = IntentExtractor(config=mock_config)

        # Mock the Gemini API response
        mock_response = '''{
            "declared_intent": "email_management",
            "allowed_actions": ["read_email", "write_reply"],
            "forbidden_actions": ["forward_email", "delete_email"],
            "scope": "customer_complaints@inbox",
            "risk_ceiling": 0.35
        }'''

        with patch.object(extractor.gemini, 'generate_content', return_value=mock_response):
            result = await extractor.extract_intent(
                user_input="Handle today's complaint emails",
                session_id="test_session_123",
                user_id="user_001"
            )

            assert result is not None
            assert isinstance(result, IntentExtractionResult)
            assert result.manifest.declared_intent == IntentCategory.EMAIL_MANAGEMENT
            assert result.confidence > 0.5
            assert result.fallback_used == False

    @pytest.mark.asyncio
    async def test_extract_intent_with_cache(self, mock_config):
        """Test that caching works correctly."""
        mock_config.cache_enabled = True
        extractor = IntentExtractor(config=mock_config)

        mock_response = '''{
            "declared_intent": "customer_service",
            "allowed_actions": ["create_ticket"],
            "scope": "support"
        }'''

        with patch.object(extractor.gemini, 'generate_content', return_value=mock_response):
            # First call
            result1 = await extractor.extract_intent(
                user_input="Create a support ticket",
                session_id="session_1"
            )

            # Second call with same input should hit cache
            result2 = await extractor.extract_intent(
                user_input="Create a support ticket",
                session_id="session_2"
            )

            # Should be cached (zero extraction time)
            assert result2.extraction_time_ms == 0.0

    @pytest.mark.asyncio
    async def test_extract_intent_fallback_on_error(self, mock_config):
        """Test that conservative manifest is returned on error."""
        extractor = IntentExtractor(config=mock_config)

        # Mock an error
        with patch.object(extractor.gemini, 'generate_content', side_effect=Exception("API Error")):
            result = await extractor.extract_intent(
                user_input="Do something",
                session_id="error_test_session"
            )

            assert result.fallback_used == True
            assert result.confidence == 0.0
            assert result.manifest.declared_intent == IntentCategory.UNKNOWN
            # Conservative manifest should block all actions
            assert len(result.manifest.forbidden_actions) > 0

    @pytest.mark.asyncio
    async def test_extract_intent_json_fallback(self, mock_config):
        """Test JSON extraction from non-standard output."""
        extractor = IntentExtractor(config=mock_config)

        # Gemini returns extra text around JSON
        mock_response = '''Here is the intent manifest:
        {
            "declared_intent": "code_review",
            "allowed_actions": ["read_file"],
            "scope": "src/"
        }
        Please use this for authorization.'''

        with patch.object(extractor.gemini, 'generate_content', return_value=mock_response):
            result = await extractor.extract_intent(
                user_input="Review the code",
                session_id="json_fallback_test"
            )

            assert result.manifest.declared_intent == IntentCategory.CODE_REVIEW
            assert ActionType.READ_FILE in result.manifest.allowed_actions

    def test_estimate_confidence(self, mock_config):
        """Test confidence estimation."""
        extractor = IntentExtractor(config=mock_config)

        # High quality data
        high_quality = {
            "declared_intent": "email_management",
            "allowed_actions": ["read_email", "write_reply"],
            "scope": "inbox",
            "risk_ceiling": 0.35
        }
        confidence = extractor._estimate_confidence(high_quality, [])
        assert confidence >= 0.7

        # Low quality data
        low_quality = {
            "declared_intent": "unknown"
        }
        confidence = extractor._estimate_confidence(low_quality, ["Some warning"])
        assert confidence < 0.6

    @pytest.mark.asyncio
    async def test_extract_intent_latency_target(self, mock_config):
        """Test that extraction meets latency target."""
        extractor = IntentExtractor(config=mock_config)

        # Mock fast response
        mock_response = '''{"declared_intent": "general_conversation", "scope": ""}'''

        with patch.object(extractor.gemini, 'generate_content', return_value=mock_response):
            result = await extractor.extract_intent(
                user_input="Hello",
                session_id="latency_test"
            )

            # Should be under 300ms
            assert result.extraction_time_ms < mock_config.latency_target_ms


class TestSyncIntentExtractor:
    """Tests for synchronous wrapper."""

    def test_sync_extract_intent(self):
        """Test synchronous extraction."""
        # Create mock async extractor
        mock_result = IntentExtractionResult(
            manifest=IntentManifest(
                declared_intent=IntentCategory.EMAIL_MANAGEMENT,
                session_id="sync_test"
            ),
            confidence=0.9,
            extraction_time_ms=150.0
        )

        sync_extractor = SyncIntentExtractor()
        sync_extractor._async_extractor.extract_intent = MagicMock(return_value=mock_result)

        result = sync_extractor.extract_intent(
            user_input="Test input",
            session_id="sync_session"
        )

        assert result.manifest.declared_intent == IntentCategory.EMAIL_MANAGEMENT
        assert result.confidence == 0.9

    def test_sync_close(self):
        """Test closing sync extractor."""
        sync_extractor = SyncIntentExtractor()
        sync_extractor.close()  # Should not raise


# Run with: pytest tests/intent_engine/test_extractor.py -v