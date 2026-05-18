"""
Database Module
===============

Async SQLAlchemy engine and models for persistent storage.
Supports both SQLite (aiosqlite) and PostgreSQL (asyncpg).
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import (
    Column, String, Integer, DateTime, Text, Index, JSON as SA_JSON,
    select, delete
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger("argus.database")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./argus.db")

_engine: Any = None
_session_factory: Any = None
_initialized = False


class Base(DeclarativeBase):
    pass


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(String(64), unique=True, nullable=False, index=True)
    data = Column(SA_JSON, nullable=False)
    status = Column(String(32), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_review_status_created", "status", "created_at"),
    )


class AuditLogEntry(Base):
    __tablename__ = "audit_log_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    user_id = Column(String(64), nullable=True)
    details = Column(SA_JSON, nullable=True)

    __table_args__ = (
        Index("ix_audit_session_event", "session_id", "event_type"),
    )


async def init_db():
    global _engine, _session_factory, _initialized
    if _initialized:
        return

    try:
        logger.info("Connecting to database: %s", DATABASE_URL.split("://")[0] + "://...")
        _engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
        _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        _initialized = True
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.warning("Database initialization failed — running without persistence: %s", e)
        _engine = None
        _session_factory = None


async def get_session() -> Optional[AsyncSession]:
    if not _initialized or _session_factory is None:
        return None
    try:
        return _session_factory()
    except Exception as e:
        logger.warning("Failed to create database session: %s", e)
        return None


async def close_db():
    global _engine, _session_factory, _initialized
    if _engine:
        try:
            await _engine.dispose()
        except Exception as e:
            logger.warning("Error closing database engine: %s", e)
        _engine = None
        _session_factory = None
        _initialized = False


# ============ Review Queue CRUD ============

async def save_review_record(item_id: str, data: dict, status: str, created_at: datetime):
    session = await get_session()
    if not session:
        return
    try:
        async with session:
            async with session.begin():
                existing = await session.execute(
                    select(ReviewRecord).where(ReviewRecord.item_id == item_id)
                )
                record = existing.scalar_one_or_none()
                if record:
                    record.data = data
                    record.status = status
                    record.updated_at = datetime.now(timezone.utc)
                else:
                    record = ReviewRecord(
                        item_id=item_id,
                        data=data,
                        status=status,
                        created_at=created_at,
                        updated_at=datetime.now(timezone.utc),
                    )
                    session.add(record)
    except Exception as e:
        logger.warning("Failed to save review record %s: %s", item_id, e)


async def update_review_record(item_id: str, status: str, data: Optional[dict] = None):
    session = await get_session()
    if not session:
        return
    try:
        async with session:
            async with session.begin():
                existing = await session.execute(
                    select(ReviewRecord).where(ReviewRecord.item_id == item_id)
                )
                record = existing.scalar_one_or_none()
                if record:
                    record.status = status
                    record.updated_at = datetime.now(timezone.utc)
                    if data is not None:
                        record.data = data
    except Exception as e:
        logger.warning("Failed to update review record %s: %s", item_id, e)


async def load_active_review_records() -> list[dict]:
    session = await get_session()
    if not session:
        return []
    try:
        async with session:
            result = await session.execute(
                select(ReviewRecord)
                .where(ReviewRecord.status.notin_(["approved", "denied", "escalated", "expired", "cancelled"]))
                .order_by(ReviewRecord.created_at)
            )
            return [row.data for row in result.scalars().all()]
    except Exception as e:
        logger.warning("Failed to load review records: %s", e)
        return []


# ============ Audit CRUD ============

async def save_audit_entry_db(
    timestamp: datetime, event_type: str, session_id: str,
    details: dict, user_id: Optional[str] = None
):
    session = await get_session()
    if not session:
        return
    try:
        async with session:
            async with session.begin():
                entry = AuditLogEntry(
                    timestamp=timestamp,
                    event_type=event_type,
                    session_id=session_id,
                    user_id=user_id,
                    details=details,
                )
                session.add(entry)
    except Exception as e:
        logger.warning("Failed to save audit entry: %s", e)


async def load_recent_audit_entries_db(limit: int = 100) -> list[dict]:
    session = await get_session()
    if not session:
        return []
    try:
        async with session:
            result = await session.execute(
                select(AuditLogEntry)
                .order_by(AuditLogEntry.timestamp.desc())
                .limit(limit)
            )
            return [
                {
                    "id": row.id,
                    "timestamp": row.timestamp.isoformat(),
                    "event_type": row.event_type,
                    "session_id": row.session_id,
                    "user_id": row.user_id,
                    "details": row.details,
                }
                for row in result.scalars().all()
            ]
    except Exception as e:
        logger.warning("Failed to load audit entries: %s", e)
        return []
