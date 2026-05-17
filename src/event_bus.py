import asyncio
from collections import deque

_event_queue: deque = deque(maxlen=500)
_subscribers: list[asyncio.Queue] = []

async def publish_event(event_type: str, data: dict):
    event = {"event_type": event_type, "data": data}
    _event_queue.append(event)
    for q in _subscribers[:]:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            _subscribers.remove(q)

def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    _subscribers.append(q)
    return q

def unsubscribe(q: asyncio.Queue):
    if q in _subscribers:
        _subscribers.remove(q)
