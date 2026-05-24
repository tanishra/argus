import asyncio
import json
import logging
import os
from typing import Optional

import redis.asyncio as redis

from .intent_engine.models import IntentManifest

logger = logging.getLogger("argus.session_store")

_redis_client: Optional[redis.Redis] = None
_memory_fallback: dict[str, str] = {}
_redis_lock = asyncio.Lock()
_memory_lock = asyncio.Lock()


async def get_redis(max_retries: int = 3) -> redis.Redis:
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    async with _redis_lock:
        if _redis_client is not None:
            return _redis_client
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        if not redis_url or redis_url.lower() in ["none", "false", "disabled", "mock", ""]:
            logger.info("Redis is disabled or not configured; using in-memory store immediately")
            return None
        for attempt in range(max_retries):
            try:
                client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
                await client.ping()
                _redis_client = client
                return _redis_client
            except Exception as e:
                logger.warning(
                    "Redis connection attempt %d/%d failed: %s", attempt + 1, max_retries, e
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(2**attempt)
        logger.warning("All Redis connection attempts failed; using in-memory fallback")
        return None


async def save_manifest(session_id: str, manifest: IntentManifest, ttl_seconds: int = 3600):
    """Save manifest to Redis with TTL. Falls back to in-memory dict."""
    client = await get_redis()
    payload = json.dumps(manifest.to_dict())
    if client:
        try:
            await client.setex(f"argus:session:{session_id}", ttl_seconds, payload)
            return
        except Exception:
            logger.exception("Redis save failed, falling back to memory")
    async with _memory_lock:
        _memory_fallback[session_id] = payload


async def get_manifest(session_id: str) -> Optional[IntentManifest]:
    """Retrieve manifest from Redis. Falls back to in-memory."""
    data = None
    client = await get_redis()
    if client:
        try:
            data = await client.get(f"argus:session:{session_id}")
        except Exception:
            logger.exception("Redis read failed, trying fallback")
    if data is None:
        async with _memory_lock:
            data = _memory_fallback.get(session_id)
    if data:
        return IntentManifest.from_dict(json.loads(data))
    return None


async def delete_manifest(session_id: str):
    """Delete manifest from Redis and fallback."""
    client = await get_redis()
    if client:
        try:
            await client.delete(f"argus:session:{session_id}")
        except Exception:
            logger.exception("Redis delete failed")
    async with _memory_lock:
        _memory_fallback.pop(session_id, None)
