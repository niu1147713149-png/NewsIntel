"""Unit tests for news service."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.article import Article, ArticleCategory, Category, Sentiment
from app.services.news_service import NewsService


async def seed_articles(db_session: AsyncSession) -> tuple[Article, Article]:
    """Insert fixture data for news service tests.

    Args:
        db_session: Active async database session.

    Returns:
        tuple[Article, Article]: Processed article and unprocessed article.
    """
    category = Category(name="Economy", slug="economy")
    processed_article = Article(
        title="Processed article",
        description="processed",
        content="content",
        url="https://example.com/news/1",
        url_hash="urlhash001",
        source_name="Example",
        published_at=datetime.now(timezone.utc),
        language="en",
        country="US",
        is_processed=True,
    )
    processed_article.sentiment = Sentiment(
        label="positive",
        positive=0.8,
        negative=0.1,
        neutral=0.1,
        confidence=0.8,
    )

    draft_article = Article(
        title="Draft article",
        description="draft",
        content="content",
        url="https://example.com/news/2",
        url_hash="urlhash002",
        source_name="Example",
        published_at=datetime.now(timezone.utc),
        language="en",
        country="US",
        is_processed=False,
    )

    db_session.add_all([category, processed_article, draft_article])
    await db_session.flush()
    db_session.add(
        ArticleCategory(
            article_id=processed_article.id,
            category_id=category.id,
            confidence=0.95,
        )
    )
    await db_session.commit()
    await db_session.refresh(processed_article)
    await db_session.refresh(draft_article)
    return processed_article, draft_article


async def seed_search_articles(db_session: AsyncSession) -> tuple[Article, Article]:
    """Insert multiple processed articles for search scenario tests.

    Args:
        db_session: Active async database session.

    Returns:
        tuple[Article, Article]: Economy and policy articles for search filtering tests.
    """
    economy_category = Category(name="Economy", slug="economy")
    policy_category = Category(name="Policy", slug="policy")

    economy_article = Article(
        title="Market rally continues",
        description="Global market is moving up",
        content="Equity market sentiment stays strong",
        url="https://example.com/news/search-1",
        url_hash="urlhash-search-001",
        source_name="Example",
        published_at=datetime(2026, 1, 2, 8, 30, tzinfo=timezone.utc),
        language="en",
        country="US",
        is_processed=True,
    )

    policy_article = Article(
        title="Policy debate update",
        description="Election committee releases latest policy agenda",
        content="Policy details are still being negotiated",
        url="https://example.com/news/search-2",
        url_hash="urlhash-search-002",
        source_name="Example",
        published_at=datetime(2026, 1, 10, 8, 30, tzinfo=timezone.utc),
        language="en",
        country="US",
        is_processed=True,
    )

    db_session.add_all([economy_category, policy_category, economy_article, policy_article])
    await db_session.flush()
    db_session.add_all(
        [
            ArticleCategory(
                article_id=economy_article.id,
                category_id=economy_category.id,
                confidence=0.91,
            ),
            ArticleCategory(
                article_id=policy_article.id,
                category_id=policy_category.id,
                confidence=0.89,
            ),
        ]
    )
    await db_session.commit()
    await db_session.refresh(economy_article)
    await db_session.refresh(policy_article)
    return economy_article, policy_article


def test_list_articles_filters_processed_and_category(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Verify list query returns only processed article and supports category filter.

    Args:
        event_loop: Per-test asyncio loop fixture.
        async_session_factory: Session factory bound to test database.

    Returns:
        None: Assertions validate filtering behavior.
    """
    async def run_scenario() -> None:
        """Run asynchronous service assertions in one coroutine.

        Returns:
            None: Assertions execute inside coroutine.
        """
        async with async_session_factory() as db_session:
            await seed_articles(db_session)
            service = NewsService(db_session)

            articles, total = await service.list_articles(page=1, size=20, category="economy")

            assert total == 1
            assert len(articles) == 1
            assert articles[0].title == "Processed article"

    event_loop.run_until_complete(run_scenario())


def test_search_articles_supports_keyword_category_and_time_range(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Verify search query applies keyword/category/time filters together.

    Args:
        event_loop: Per-test asyncio loop fixture.
        async_session_factory: Session factory bound to test database.

    Returns:
        None: Assertions validate combined search behavior.
    """

    async def run_scenario() -> None:
        """Run asynchronous search assertions in one coroutine.

        Returns:
            None: Assertions execute inside coroutine.
        """
        async with async_session_factory() as db_session:
            await seed_search_articles(db_session)
            service = NewsService(db_session)

            articles, total = await service.search_articles(
                q="market",
                category="economy",
                from_datetime=datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
                to_datetime=datetime(2026, 1, 5, 23, 59, tzinfo=timezone.utc),
                page=1,
                size=20,
            )

            assert total == 1
            assert len(articles) == 1
            assert articles[0].title == "Market rally continues"

    event_loop.run_until_complete(run_scenario())


def test_get_article_detail_returns_none_for_unprocessed(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Verify detail query excludes unprocessed articles.

    Args:
        event_loop: Per-test asyncio loop fixture.
        async_session_factory: Session factory bound to test database.

    Returns:
        None: Assertions validate detail query constraints.
    """
    async def run_scenario() -> None:
        """Run asynchronous detail query assertions in one coroutine.

        Returns:
            None: Assertions execute inside coroutine.
        """
        async with async_session_factory() as db_session:
            processed_article, draft_article = await seed_articles(db_session)
            service = NewsService(db_session)

            processed = await service.get_article_detail(processed_article.id)
            draft = await service.get_article_detail(draft_article.id)

            assert processed is not None
            assert processed.id == processed_article.id
            assert draft is None

    event_loop.run_until_complete(run_scenario())
