"""
Audit Log Module
================

Dual-write audit logging: file-based (JSON lines) + SQL database.
File is primary for backward compatibility; SQL enables querying.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("argus.audit")

AUDIT_LOG_PATH = os.path.abspath(os.getenv("AUDIT_LOG_PATH", "data/audit.log"))


def _ensure_dir(path: str):
    dirname = os.path.dirname(path)
    if dirname and not os.path.exists(dirname):
        os.makedirs(dirname, exist_ok=True)


def _build_entry(
    event_type: str,
    session_id: str,
    details: dict,
    user_id: Optional[str] = None,
) -> dict:
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "session_id": session_id,
        "user_id": user_id,
        "details": details,
    }


async def _write_file(entry: dict):
    _ensure_dir(AUDIT_LOG_PATH)
    try:
        with open(AUDIT_LOG_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")
            f.flush()
            os.fsync(f.fileno())
    except OSError as e:
        logger.error("Failed to write audit log file: %s", e)


async def _write_db(entry: dict):
    try:
        from .database import save_audit_entry_db

        await save_audit_entry_db(
            timestamp=datetime.fromisoformat(entry["timestamp"]),
            event_type=entry["event_type"],
            session_id=entry["session_id"],
            details=entry.get("details", {}),
            user_id=entry.get("user_id"),
        )
    except Exception as e:
        logger.warning("Failed to write audit entry to database: %s", e)


async def log_event(
    event_type: str,
    session_id: str,
    details: dict,
    user_id: Optional[str] = None,
):
    entry = _build_entry(event_type, session_id, details, user_id)
    await _write_file(entry)
    await _write_db(entry)


async def backfill_file_to_db():
    """Migrate existing file-based audit entries to the database."""
    try:
        from .database import load_recent_audit_entries_db, save_audit_entry_db

        existing_db = await load_recent_audit_entries_db(limit=1)
        if existing_db:
            return

        file_entries = await _read_file(limit=10000)
        if not file_entries:
            return

        for entry in file_entries:
            await save_audit_entry_db(
                timestamp=datetime.fromisoformat(entry["timestamp"]),
                event_type=entry["event_type"],
                session_id=entry["session_id"],
                details=entry.get("details", {}),
                user_id=entry.get("user_id"),
            )
        logger.info("Backfilled %d audit entries from file to database", len(file_entries))
    except Exception as e:
        logger.warning("Audit backfill failed: %s", e)


async def get_recent_events(limit: int = 100) -> list[dict]:
    try:
        from .database import load_recent_audit_entries_db

        db_entries = await load_recent_audit_entries_db(limit)
        if db_entries:
            return db_entries
    except Exception as e:
        logger.warning("Failed to read audit entries from database: %s", e)

    return await _read_file(limit)


async def _read_file(limit: int = 100) -> list[dict]:
    _ensure_dir(AUDIT_LOG_PATH)
    events = []
    try:
        if os.path.exists(AUDIT_LOG_PATH):
            with open(AUDIT_LOG_PATH) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        events.append(json.loads(line))
    except (OSError, json.JSONDecodeError) as e:
        logger.error("Failed to read audit log file: %s", e)
    return events[-limit:]
