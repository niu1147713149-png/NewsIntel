"""SQLAlchemy async ORM base classes and common mixins.

Follows project rules:
- BIGSERIAL-like integer primary keys
- TIMESTAMPTZ (timezone-aware) timestamps
- Soft delete via is_deleted flag
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, BigInteger, func
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(AsyncAttrs, DeclarativeBase):
    """Declarative base for all ORM models."""


class TimestampMixin:
    """Created/updated timestamps using timezone-aware fields.

    Uses server-side defaults compatible with PostgreSQL; works on SQLite too.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), server_onupdate=func.now(), nullable=False
    )


class SoftDeleteMixin:
    """Soft delete flag instead of physical deletes."""

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class PKMixin:
    """Unified BIGSERIAL-like primary key (autoincrement BIGINT)."""

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
