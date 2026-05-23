"""
Tests for event_bus — SSE pub/sub event system.
"""

import asyncio
import pytest
from unittest.mock import patch

from src import event_bus


@pytest.fixture(autouse=True)
def reset_subscribers():
    event_bus._subscribers.clear()
    event_bus._sweep_task = None
    yield


@pytest.mark.asyncio
async def test_subscribe_returns_queue():
    q = await event_bus.subscribe()
    assert q is not None
    assert q.maxsize == 100


@pytest.mark.asyncio
async def test_publish_delivers_to_subscriber():
    q = await event_bus.subscribe()
    await event_bus.publish_event("test_event", {"key": "value"})
    event = await q.get()
    assert event["type"] == "test_event"
    assert event["data"]["key"] == "value"


@pytest.mark.asyncio
async def test_publish_to_multiple_subscribers():
    q1 = await event_bus.subscribe()
    q2 = await event_bus.subscribe()
    await event_bus.publish_event("broadcast", {"msg": "hello"})
    e1 = await q1.get()
    e2 = await q2.get()
    assert e1["data"]["msg"] == "hello"
    assert e2["data"]["msg"] == "hello"


@pytest.mark.asyncio
async def test_unsubscribed_gets_no_events():
    q = await event_bus.subscribe()
    qid = id(q)
    await event_bus.unsubscribe(q)
    assert qid not in event_bus._subscribers


@pytest.mark.asyncio
async def test_sweep_removes_stale_subscribers():
    q = await event_bus.subscribe()
    qid = id(q)
    event_bus._subscribers[qid] = (q, 0.0)
    await event_bus.sweep_stale_subscribers(stale_seconds=10.0)
    assert qid not in event_bus._subscribers


@pytest.mark.asyncio
async def test_sweep_keeps_recent_subscribers():
    q = await event_bus.subscribe()
    qid = id(q)
    await event_bus.sweep_stale_subscribers(stale_seconds=3600.0)
    assert qid in event_bus._subscribers


@pytest.mark.asyncio
async def test_start_stop_sweeper():
    await event_bus.start_sweeper(interval=1.0, stale_seconds=60.0)
    assert event_bus._sweep_task is not None
    assert not event_bus._sweep_task.done()

    await event_bus.stop_sweeper()
    assert event_bus._sweep_task is None


@pytest.mark.asyncio
async def test_publish_does_not_block_on_full_queue():
    q = asyncio.Queue(maxsize=1)
    qid = id(q)
    event_bus._subscribers[qid] = (q, 1000.0)

    await event_bus.publish_event("first", {})
    await event_bus.publish_event("second", {})

    e = await q.get()
    assert e["type"] == "first"
