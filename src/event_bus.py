import asyncio
import logging
import time
from typing import Optional

logger = logging.getLogger("argus.event_bus")

_subscribers: dict[int, tuple[asyncio.Queue, float]] = {}
_subscriber_lock: asyncio.Lock = asyncio.Lock()
_sweep_task: Optional[asyncio.Task] = None

async def publish_event(event_type: str, data: dict):
    event = {"type": event_type, "data": data}
    now = time.monotonic()
    async with _subscriber_lock:
        for sid, (q, _) in list(_subscribers.items()):
            _subscribers[sid] = (q, now)
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("Dropped event for subscriber %s — queue full", sid)

async def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    async with _subscriber_lock:
        _subscribers[id(q)] = (q, time.monotonic())
    return q

async def unsubscribe(q: asyncio.Queue):
    async with _subscriber_lock:
        _subscribers.pop(id(q), None)

async def sweep_stale_subscribers(stale_seconds: float = 60.0):
    """Remove subscribers whose event loops have died without cleanup."""
    now = time.monotonic()
    async with _subscriber_lock:
        stale = [k for k, (_, t) in list(_subscribers.items()) if now - t > stale_seconds]
        for k in stale:
            _subscribers.pop(k, None)

async def start_sweeper(interval: float = 30.0, stale_seconds: float = 60.0):
    global _sweep_task
    if _sweep_task is not None:
        _sweep_task.cancel()
    async def _sweep():
        try:
            while True:
                await asyncio.sleep(interval)
                await sweep_stale_subscribers(stale_seconds)
        except asyncio.CancelledError:
            pass
    _sweep_task = asyncio.create_task(_sweep())

async def stop_sweeper():
    global _sweep_task
    if _sweep_task:
        _sweep_task.cancel()
        _sweep_task = None
