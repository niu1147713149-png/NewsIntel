"""Async SQLAlchemy engine and session factory utilities."""

from collections.abc import AsyncGenerator
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings


@lru_cache
def get_async_engine() -> AsyncEngine:
    """Create SQLAlchemy async engine from runtime settings.

    Returns:
        AsyncEngine: Configured async engine instance.
    """
    settings = get_settings()
    connect_args: dict[str, bool] = {}
    if settings.database_url.startswith("sqlite+aiosqlite"):
        connect_args["check_same_thread"] = False
    return create_async_engine(
        settings.database_url,
        echo=False,
        future=True,
        pool_pre_ping=True,
        connect_args=connect_args,
    )


@lru_cache
def get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create async sessionmaker bound to cached engine.

    Returns:
        async_sessionmaker[AsyncSession]: Session factory for request-scoped sessions.
    """
    return async_sessionmaker(
        bind=get_async_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session for dependency injection.

    Yields:
        AsyncSession: Active SQLAlchemy async session.
    """
    async with get_async_session_factory()() as session:
        yield session
