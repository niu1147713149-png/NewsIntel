from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ingestion import FetchedNewsItem
from app.models.article import Article, ArticleCategory, Category
from app.services.news_stream_bus import reset_news_stream_bus
from scripts.ingest_news import map_to_category_slug, run_ingestion


class FakeSkill:
    source_key = "fake_source"
    source_name = "Fake Source"

    async def fetch(self, limit: int) -> list[FetchedNewsItem]:
        items = [
            _build_item(
                title="Central bank policy update lifts market confidence",
                url="https://example.com/news/ingest-1",
            ),
            _build_item(
                title="Central bank policy update lifts market confidence",
                url="https://example.com/news/ingest-1",
            ),
        ]
        return items[:limit]


class FakeSkillA:
    source_key = "source_a"
    source_name = "Source A"

    async def fetch(self, limit: int) -> list[FetchedNewsItem]:
        items = [
            _build_item(
                title="Government policy update and central bank statement",
                url="https://example.com/news/shared-url",
            ),
            _build_item(
                title="Global inflation and market growth surprise analysts",
                url="https://example.com/news/a-only",
            ),
        ]
        return items[:limit]


class FakeSkillB:
    source_key = "source_b"
    source_name = "Source B"

    async def fetch(self, limit: int) -> list[FetchedNewsItem]:
        items = [
            _build_item(
                title="Government policy update and central bank statement",
                url="https://example.com/news/shared-url",
            ),
            _build_item(
                title="Election campaign enters final week with new poll",
                url="https://example.com/news/b-only",
            ),
        ]
        return items[:limit]


class FakeSkillUnique:
    source_key = "unique_source"
    source_name = "Unique Source"

    async def fetch(self, limit: int) -> list[FetchedNewsItem]:
        items = [
            _build_item(
                title="Trade agreement supports market outlook",
                url="https://example.com/news/unique-1",
            ),
            _build_item(
                title="Policy meeting confirms rate pause",
                url="https://example.com/news/unique-2",
            ),
        ]
        return items[:limit]


def _build_item(title: str, url: str) -> FetchedNewsItem:
    return FetchedNewsItem(
        title=title,
        url=url,
        published_at=datetime.now(timezone.utc),
        description=title,
        content=title,
        source_name="Fake Source",
    )


def _seed_categories(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def run_seed() -> None:
        async with async_session_factory() as session:
            session.add_all(
                [
                    Category(name="Geopolitics", slug="geopolitics"),
                    Category(name="Elections", slug="elections"),
                    Category(name="Economy", slug="economy"),
                    Category(name="Crime", slug="crime"),
                    Category(name="Bilateral Agreements", slug="bilateral_agreements"),
                    Category(name="Policy", slug="policy"),
                ]
            )
            await session.commit()

    event_loop.run_until_complete(run_seed())


def test_map_to_category_slug_prefers_economy_keywords() -> None:
    item = _build_item(
        title="Inflation drops while global market rallies",
        url="https://example.com/news/mapping-case",
    )

    slug, confidence = map_to_category_slug(item)

    assert slug == "economy"
    assert 0.5 <= confidence <= 0.9


def test_run_ingestion_inserts_once_when_source_returns_duplicate_url(
    monkeypatch: pytest.MonkeyPatch,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _seed_categories(event_loop, async_session_factory)

    from scripts import ingest_news

    ingest_news.get_async_session_factory.cache_clear()
    monkeypatch.setattr(ingest_news, "get_async_session_factory", lambda: async_session_factory)
    monkeypatch.setattr(ingest_news, "get_available_skills", lambda: {"fake_source": FakeSkill()})

    async def run_scenario() -> None:
        stats = await run_ingestion(source="fake_source", limit=10)
        assert stats.fetched == 2
        assert stats.inserted == 1
        assert stats.skipped_duplicate == 1

        async with async_session_factory() as session:
            articles = list(await session.scalars(select(Article)))
            links = list(await session.scalars(select(ArticleCategory)))
            assert len(articles) == 1
            assert len(links) == 1

    event_loop.run_until_complete(run_scenario())


def test_run_ingestion_all_mode_aggregates_stats_and_deduplicates_across_sources(
    monkeypatch: pytest.MonkeyPatch,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _seed_categories(event_loop, async_session_factory)

    from scripts import ingest_news

    ingest_news.get_async_session_factory.cache_clear()
    monkeypatch.setattr(ingest_news, "get_async_session_factory", lambda: async_session_factory)
    monkeypatch.setattr(
        ingest_news,
        "get_available_skills",
        lambda: {"source_a": FakeSkillA(), "source_b": FakeSkillB()},
    )

    async def run_scenario() -> None:
        stats = await run_ingestion(source="all", limit=10)
        assert stats.fetched == 4
        assert stats.inserted == 3
        assert stats.skipped_duplicate == 1
        assert stats.skipped_invalid == 0
        assert stats.failed == 0

        async with async_session_factory() as session:
            articles = list(await session.scalars(select(Article)))
            links = list(await session.scalars(select(ArticleCategory)))
            assert len(articles) == 3
            assert len(links) == 3

    event_loop.run_until_complete(run_scenario())


def test_run_ingestion_global_limit_caps_total_inserted_only_in_all_mode(
    monkeypatch: pytest.MonkeyPatch,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _seed_categories(event_loop, async_session_factory)

    from scripts import ingest_news

    ingest_news.get_async_session_factory.cache_clear()
    monkeypatch.setattr(ingest_news, "get_async_session_factory", lambda: async_session_factory)
    monkeypatch.setattr(
        ingest_news,
        "get_available_skills",
        lambda: {"source_a": FakeSkillA(), "source_b": FakeSkillB()},
    )

    async def run_scenario() -> None:
        stats = await run_ingestion(source="all", limit=20, global_limit=2)
        assert stats.fetched == 2
        assert stats.inserted == 2
        assert stats.skipped_duplicate == 0

        async with async_session_factory() as session:
            articles = list(await session.scalars(select(Article)))
            assert len(articles) == 2

    event_loop.run_until_complete(run_scenario())


def test_run_ingestion_per_source_limit_overrides_default_limit_and_global_limit_ignored_for_single_source(
    monkeypatch: pytest.MonkeyPatch,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _seed_categories(event_loop, async_session_factory)

    from scripts import ingest_news

    ingest_news.get_async_session_factory.cache_clear()
    monkeypatch.setattr(ingest_news, "get_async_session_factory", lambda: async_session_factory)
    monkeypatch.setattr(
        ingest_news,
        "get_available_skills",
        lambda: {
            "source_a": FakeSkillA(),
            "source_b": FakeSkillB(),
            "unique_source": FakeSkillUnique(),
        },
    )

    async def run_scenario() -> None:
        overridden_stats = await run_ingestion(source="source_a", limit=1, per_source_limit=2)
        assert overridden_stats.fetched == 2

        single_stats = await run_ingestion(
            source="unique_source",
            limit=20,
            per_source_limit=2,
            global_limit=1,
        )
        assert single_stats.inserted == 2

    event_loop.run_until_complete(run_scenario())


def test_run_ingestion_publishes_inserted_articles_to_news_stream_bus(
    monkeypatch: pytest.MonkeyPatch,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _seed_categories(event_loop, async_session_factory)

    from scripts import ingest_news

    ingest_news.get_async_session_factory.cache_clear()
    monkeypatch.setattr(ingest_news, "get_async_session_factory", lambda: async_session_factory)
    monkeypatch.setattr(ingest_news, "get_available_skills", lambda: {"fake_source": FakeSkill()})

    async def run_scenario() -> None:
        bus = reset_news_stream_bus()
        subscriber = bus.subscribe()

        try:
            stats = await run_ingestion(source="fake_source", limit=10)
            payload = await asyncio.wait_for(subscriber.get(), timeout=1)
        finally:
            bus.unsubscribe(subscriber)

        assert stats.inserted == 1
        assert payload["event"] == "news-update"
        assert payload["count"] == 1
        assert payload["items"][0]["title"] == "Central bank policy update lifts market confidence"

    event_loop.run_until_complete(run_scenario())
