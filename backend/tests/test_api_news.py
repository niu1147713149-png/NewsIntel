"""API tests for news list/detail endpoints."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.article import Article, ArticleCategory, Category, Sentiment


async def seed_api_articles(async_session_factory: async_sessionmaker[AsyncSession]) -> Article:
    """Insert one processed article for API endpoint tests.

    Args:
        async_session_factory: Session factory bound to test database.

    Returns:
        Article: Persisted processed article.
    """
    article = Article(
        title="API article",
        description="api test",
        content="api content",
        url="https://example.com/news/api",
        url_hash="urlhash-api",
        source_name="Example",
        published_at=datetime.now(timezone.utc),
        language="en",
        country="US",
        is_processed=True,
    )
    category = Category(name="Economy", slug="economy")
    article.sentiment = Sentiment(
        label="neutral",
        positive=0.2,
        negative=0.2,
        neutral=0.6,
        confidence=0.6,
    )
    async with async_session_factory() as db_session:
        db_session.add_all([category, article])
        await db_session.flush()
        db_session.add(
            ArticleCategory(
                article_id=article.id,
                category_id=category.id,
                confidence=0.88,
            )
        )
        await db_session.commit()
        await db_session.refresh(article)
    return article


def test_list_news_success(
    client: TestClient,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Verify list endpoint returns standardized payload and pagination metadata.

    Args:
        client: FastAPI test client fixture.
        event_loop: Per-test asyncio loop fixture.
        async_session_factory: Session factory bound to test database.

    Returns:
        None: Assertions validate response structure and data.
    """
    event_loop.run_until_complete(seed_api_articles(async_session_factory))

    response = client.get("/api/v1/news?page=1&size=20")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["meta"]["page"] == 1
    assert payload["meta"]["size"] == 20
    assert payload["meta"]["total"] == 1
    assert len(payload["data"]) == 1
    assert payload["data"][0]["title"] == "API article"


def test_get_news_detail_not_found(client: TestClient) -> None:
    """Verify detail endpoint returns 404 when article does not exist.

    Args:
        client: FastAPI test client fixture.

    Returns:
        None: Assertions validate not found behavior.
    """
    response = client.get("/api/v1/news/999999")
    assert response.status_code == 404


def test_search_news_success(
    client: TestClient,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Verify search endpoint supports q/category/from/to filters and pagination.

    Args:
        client: FastAPI test client fixture.
        event_loop: Per-test asyncio loop fixture.
        async_session_factory: Session factory bound to test database.

    Returns:
        None: Assertions validate search response structure and filter behavior.
    """

    async def seed_search_case() -> None:
        """Insert two processed articles for search endpoint assertions.

        Returns:
            None: Persists test fixtures only.
        """
        economy_category = Category(name="Economy", slug="economy")
        policy_category = Category(name="Policy", slug="policy")
        economy_article = Article(
            title="Market rebound in Asia",
            description="market watch",
            content="Market optimism keeps growing",
            url="https://example.com/news/api-search-1",
            url_hash="urlhash-api-search-1",
            source_name="Example",
            published_at=datetime(2026, 1, 3, 10, 0, tzinfo=timezone.utc),
            language="en",
            country="US",
            is_processed=True,
        )
        policy_article = Article(
            title="Policy summit starts",
            description="policy update",
            content="No market term here",
            url="https://example.com/news/api-search-2",
            url_hash="urlhash-api-search-2",
            source_name="Example",
            published_at=datetime(2026, 1, 9, 10, 0, tzinfo=timezone.utc),
            language="en",
            country="US",
            is_processed=True,
        )
        async with async_session_factory() as db_session:
            db_session.add_all([economy_category, policy_category, economy_article, policy_article])
            await db_session.flush()
            db_session.add_all(
                [
                    ArticleCategory(
                        article_id=economy_article.id,
                        category_id=economy_category.id,
                        confidence=0.92,
                    ),
                    ArticleCategory(
                        article_id=policy_article.id,
                        category_id=policy_category.id,
                        confidence=0.86,
                    ),
                ]
            )
            await db_session.commit()

    event_loop.run_until_complete(seed_search_case())

    response = client.get(
        "/api/v1/news/search",
        params={
            "q": "market",
            "category": "economy",
            "from": "2026-01-01T00:00:00Z",
            "to": "2026-01-05T23:59:59Z",
            "page": 1,
            "size": 20,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["meta"]["total"] == 1
    assert payload["meta"]["page"] == 1
    assert payload["meta"]["size"] == 20
    assert len(payload["data"]) == 1
    assert payload["data"][0]["title"] == "Market rebound in Asia"


def test_search_news_invalid_time_range_returns_422(client: TestClient) -> None:
    """Verify search endpoint rejects invalid from/to time range.

    Args:
        client: FastAPI test client fixture.

    Returns:
        None: Assertions validate query validation behavior.
    """
    response = client.get(
        "/api/v1/news/search",
        params={
            "from": "2026-01-10T00:00:00Z",
            "to": "2026-01-01T00:00:00Z",
        },
    )

    assert response.status_code == 422
