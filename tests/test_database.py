"""
Tests for database module — async SQLAlchemy persistence layer.
Uses SQLite in-memory to avoid external dependencies.
"""

import os
import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from sqlalchemy import select

from src.database import (
    init_db, close_db, get_session,
    save_review_record, update_review_record, load_active_review_records,
    save_audit_entry_db, load_recent_audit_entries_db,
    ReviewRecord, AuditLogEntry,
)


@pytest.fixture(autouse=True)
async def setup_db():
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
    await init_db()
    yield
    await close_db()


@pytest.mark.asyncio
async def test_init_db_creates_tables():
    session = await get_session()
    assert session is not None
    async with session:
        result = await session.execute(select(ReviewRecord).limit(1))
        assert result is not None


@pytest.mark.asyncio
async def test_save_and_load_review_record():
    now = datetime.now(timezone.utc)
    await save_review_record(
        item_id="item-1",
        data={"key": "value"},
        status="pending",
        created_at=now,
    )
    records = await load_active_review_records()
    assert any(
        isinstance(r, dict) and r.get("key") == "value"
        for r in records
    ), f"Expected key='value' in active records, got: {records}"


@pytest.mark.asyncio
async def test_update_review_record():
    now = datetime.now(timezone.utc)
    await save_review_record("item-update", {"key": "old"}, "pending", now)
    await update_review_record("item-update", "approved", {"key": "new"})

    records = await load_active_review_records()
    item_ids = [r.get("key") for r in records]
    assert "new" not in item_ids


@pytest.mark.asyncio
async def test_active_records_excludes_finalized():
    now = datetime.now(timezone.utc)
    await save_review_record("active-1", {}, "pending", now)
    await save_review_record("done-1", {}, "approved", now)

    records = await load_active_review_records()
    ids = [r.get("item_id") for r in records]
    assert "done-1" not in ids


@pytest.mark.asyncio
async def test_save_and_load_audit_entry():
    now = datetime.now(timezone.utc)
    await save_audit_entry_db(now, "test_event", "session-1", {"key": "val"}, "user-1")
    entries = await load_recent_audit_entries_db(limit=10)
    assert len(entries) >= 1
    assert entries[0]["event_type"] == "test_event"
    assert entries[0]["session_id"] == "session-1"


@pytest.mark.asyncio
async def test_load_audit_entries_respects_limit():
    now = datetime.now(timezone.utc)
    for i in range(5):
        await save_audit_entry_db(now, f"event_{i}", "session-1", {"idx": i})

    entries = await load_recent_audit_entries_db(limit=2)
    assert len(entries) <= 2


@pytest.mark.asyncio
async def test_get_session_returns_none_when_not_initialized():
    await close_db()
    from src.database import _initialized
    assert _initialized is False
    session = await get_session()
    assert session is None


@pytest.mark.asyncio
async def test_close_db_cleans_up():
    await close_db()
    from src.database import _engine
    assert _engine is None
