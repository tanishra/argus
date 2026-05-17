import json
import os
import redis.asyncio as redis
from typing import Optional
from .intent_engine.models import IntentManifest

_redis_client: Optional[redis.Redis] = None

async def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _redis_client = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True
        )
    return _redis_client

async def save_manifest(session_id: str, manifest: IntentManifest, ttl_seconds: int = 3600):
    """Save manifest to Redis with TTL."""
    client = await get_redis()
    await client.setex(
        f"argus:session:{session_id}",
        ttl_seconds,
        json.dumps(manifest.to_dict())
    )

async def get_manifest(session_id: str) -> Optional[IntentManifest]:
    """Retrieve manifest from Redis."""
    client = await get_redis()
    data = await client.get(f"argus:session:{session_id}")
    if data:
        return IntentManifest.from_dict(json.loads(data))
    return None

async def delete_manifest(session_id: str):
    """Delete manifest from Redis."""
    client = await get_redis()
    await client.delete(f"argus:session:{session_id}")
