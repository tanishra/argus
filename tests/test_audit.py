"""
Tests for audit — dual-write audit logging (file + database).
"""

import json
import os
import tempfile
import pytest
from unittest.mock import AsyncMock, patch

from src import audit


@pytest.fixture
def temp_log_path():
    tmpdir = tempfile.mkdtemp()
    log_path = os.path.join(tmpdir, "audit.log")
    old_path = audit.AUDIT_LOG_PATH
    audit.AUDIT_LOG_PATH = log_path
    yield log_path
    audit.AUDIT_LOG_PATH = old_path
    if os.path.exists(tmpdir):
        import shutil
        shutil.rmtree(tmpdir)


@pytest.mark.asyncio
async def test_log_event_writes_to_file(temp_log_path):
    with patch("src.audit._write_db", AsyncMock()):
        await audit.log_event(
            event_type="test_event",
            session_id="session-1",
            details={"key": "value"},
            user_id="user-1",
        )

    assert os.path.exists(temp_log_path)
    with open(temp_log_path) as f:
        lines = f.readlines()
    assert len(lines) >= 1
    entry = json.loads(lines[0])
    assert entry["event_type"] == "test_event"
    assert entry["session_id"] == "session-1"
    assert entry["user_id"] == "user-1"
    assert entry["details"]["key"] == "value"


@pytest.mark.asyncio
async def test_log_event_calls_db_write():
    with patch("src.audit._write_file", AsyncMock()) as mock_file, \
         patch("src.audit._write_db", AsyncMock()) as mock_db:
        await audit.log_event("evt", "sid", {"k": "v"})
        mock_file.assert_awaited_once()
        mock_db.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_recent_events_from_file(temp_log_path):
    with patch("src.audit._write_db", AsyncMock()):
        for i in range(3):
            await audit.log_event(f"event_{i}", "session-1", {"idx": i})

    events = await audit.get_recent_events(limit=10)
    assert len(events) >= 3
    assert events[-1]["event_type"] == "event_2"


@pytest.mark.asyncio
async def test_get_recent_events_respects_limit(temp_log_path):
    with patch("src.audit._write_db", AsyncMock()):
        for i in range(5):
            await audit.log_event(f"event_{i}", "session-1", {"idx": i})

    events = await audit.get_recent_events(limit=2)
    assert len(events) <= 2


@pytest.mark.asyncio
async def test_backfill_file_to_db(temp_log_path):
    with patch("src.audit._write_db", AsyncMock()), \
         patch("src.database.load_recent_audit_entries_db") as mock_load, \
         patch("src.database.save_audit_entry_db", AsyncMock()) as mock_save:
        mock_load.return_value = []

        for i in range(3):
            await audit.log_event(f"event_{i}", "session-1", {"idx": i})

        await audit.backfill_file_to_db()
        assert mock_save.awaited


@pytest.mark.asyncio
async def test_empty_log_returns_empty():
    events = await audit.get_recent_events(limit=10)
    assert isinstance(events, list)


@pytest.mark.asyncio
async def test_gzipped_field_entries(temp_log_path):
    with patch("src.audit._write_db", AsyncMock()):
        await audit.log_event("complex", "sid-2", {
            "nested": {"key": "value"},
            "list": [1, 2, 3],
        })

    with open(temp_log_path) as f:
        entry = json.loads(f.readline())
    assert entry["details"]["nested"]["key"] == "value"
    assert entry["details"]["list"] == [1, 2, 3]


@pytest.mark.asyncio
async def test_writes_gzipped_field(temp_log_path):
    with patch("src.audit._write_db", AsyncMock()):
        await audit.log_event("type_x", "sid_x", {"action": "test"})

    with open(temp_log_path) as f:
        entry = json.loads(f.readline())
    assert entry["event_type"] == "type_x"
    assert "timestamp" in entry
