import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("argus.audit")

AUDIT_LOG_PATH = os.getenv("AUDIT_LOG_PATH", "data/audit.log")


def _ensure_dir(path: str):
    dirname = os.path.dirname(path)
    if dirname and not os.path.exists(dirname):
        os.makedirs(dirname, exist_ok=True)


async def log_event(
    event_type: str,
    session_id: str,
    details: dict,
    user_id: Optional[str] = None,
):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "session_id": session_id,
        "user_id": user_id,
        "details": details,
    }
    _ensure_dir(AUDIT_LOG_PATH)
    try:
        with open(AUDIT_LOG_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError as e:
        logger.error("Failed to write audit log: %s", e)


async def get_recent_events(limit: int = 100) -> list[dict]:
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
        logger.error("Failed to read audit log: %s", e)
    return events[-limit:]