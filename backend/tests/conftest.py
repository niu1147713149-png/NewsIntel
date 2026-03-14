"""Shared pytest fixtures for async database and API testing."""

from __future__ import annotations

import asyncio
import sys
from collections.abc import AsyncGenerator, Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.deps import get_db_session
from app.main import app
from app.models import Base

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Provide dedicated asyncio loop for each test.

    Args:
        None: Fixture has no runtime arguments.

    Returns:
        Generator[asyncio.AbstractEventLoop, None, None]: Event loop for async calls in sync tests.
    """
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def async_engine(
    tmp_path: Path,
    event_loop: asyncio.AbstractEventLoop,
) -> Generator[AsyncEngine, None, None]:
    """Create isolated async SQLite engine for each test.

    Args:
        tmp_path: Built-in pytest temporary directory fixture.
        event_loop: Per-test asyncio event loop fixture.

    Returns:
        Generator[AsyncEngine, None, None]: Engine lifecycle fixture.
    """
    database_file = tmp_path / "test_news.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_file}", echo=False)

    async def setup_schema() -> None:
        """Create all database tables before each test.

        Returns:
            None: Performs DDL setup only.
        """
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    event_loop.run_until_complete(setup_schema())

    yield engine

    async def teardown_schema() -> None:
        """Drop all database tables and dispose engine after each test.

        Returns:
            None: Performs teardown only.
        """
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
        await engine.dispose()

    event_loop.run_until_complete(teardown_schema())


@pytest.fixture
def async_session_factory(async_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Build async session factory bound to test engine.

    Args:
        async_engine: Async engine fixture.

    Returns:
        async_sessionmaker[AsyncSession]: Session factory for test queries.
    """
    return async_sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture
def client(async_session_factory: async_sessionmaker[AsyncSession]) -> Generator[TestClient, None, None]:
    """Create FastAPI TestClient with dependency-overridden test database.

    Args:
        async_session_factory: Test session factory fixture.

    Returns:
        Generator[TestClient, None, None]: Synchronous client for API tests.
    """

    async def override_db_session() -> AsyncGenerator[AsyncSession, None]:
        """Provide per-request async session for API tests.

        Returns:
            AsyncGenerator[AsyncSession, None]: Async session for route dependency.
        """
        async with async_session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
