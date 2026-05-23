"""
Tests for session_store — Redis-backed manifest store with in-memory fallback.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.session_store import save_manifest, get_manifest, delete_manifest
from src.intent_engine.models import IntentManifest, IntentCategory


@pytest.fixture
def manifest():
    return IntentManifest(
        declared_intent=IntentCategory.EMAIL_MANAGEMENT,
        session_id="test-session",
    )


@pytest.mark.asyncio
async def test_save_and_get_manifest_with_mocked_redis(manifest):
    mock_redis = MagicMock()
    mock_redis.setex = AsyncMock()

    with patch("src.session_store.get_redis", AsyncMock(return_value=mock_redis)), \
         patch("src.session_store._memory_fallback", {}):

        await save_manifest("session-1", manifest)
        mock_redis.setex.assert_called_once()
        args = mock_redis.setex.call_args[0]
        assert args[0] == "argus:session:session-1"
        assert isinstance(args[1], int)


@pytest.mark.asyncio
async def test_get_manifest_returns_none_for_unknown():
    with patch("src.session_store.get_redis", AsyncMock(return_value=None)), \
         patch("src.session_store._memory_fallback", {}):

        result = await get_manifest("nonexistent")
        assert result is None


@pytest.mark.asyncio
async def test_in_memory_fallback_on_redis_failure(manifest):
    with patch("src.session_store.get_redis", AsyncMock(return_value=None)):
        await save_manifest("session-fallback", manifest)

    with patch("src.session_store.get_redis", AsyncMock(return_value=None)):
        retrieved = await get_manifest("session-fallback")
        assert retrieved is not None
        assert retrieved.declared_intent == IntentCategory.EMAIL_MANAGEMENT


@pytest.mark.asyncio
async def test_delete_manifest(manifest):
    mock_redis = MagicMock()
    mock_redis.delete = AsyncMock()

    with patch("src.session_store.get_redis", AsyncMock(return_value=mock_redis)), \
         patch("src.session_store._memory_fallback", {}):

        await save_manifest("session-del", manifest)
        await delete_manifest("session-del")
        mock_redis.delete.assert_called_once_with("argus:session:session-del")


@pytest.mark.asyncio
async def test_manifest_serialization_roundtrip(manifest):
    with patch("src.session_store.get_redis", AsyncMock(return_value=None)):
        await save_manifest("rt-session", manifest)

    with patch("src.session_store.get_redis", AsyncMock(return_value=None)):
        retrieved = await get_manifest("rt-session")
        assert retrieved.session_id == manifest.session_id
        assert retrieved.declared_intent == manifest.declared_intent
        assert retrieved.to_dict() == manifest.to_dict()


@pytest.mark.asyncio
async def test_get_manifest_from_redis(manifest):
    mock_redis = MagicMock()
    mock_redis.get = AsyncMock(return_value=json.dumps(manifest.to_dict()))

    with patch("src.session_store.get_redis", AsyncMock(return_value=mock_redis)):
        retrieved = await get_manifest("redis-session")
        assert retrieved is not None
        assert retrieved.declared_intent == IntentCategory.EMAIL_MANAGEMENT
