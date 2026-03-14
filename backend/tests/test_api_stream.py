from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.v1.routes.stream import generate_news_events
from app.models.article import Article, ArticleCategory, Category, Sentiment
from app.schemas.news import ArticleOut
from app.services.news_stream_bus import reset_news_stream_bus


async def seed_stream_articles(async_session_factory: async_sessionmaker[AsyncSession]) -> None:
    article = Article(
        title="Stream article",
        description="stream test",
        content="stream content",
        url="https://example.com/news/stream-api",
        url_hash="urlhash-stream-api",
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


def _decode_chunk(chunk: str | bytes | bytearray | memoryview[int]) -> str:
    if isinstance(chunk, str):
        return chunk
    return bytes(chunk).decode("utf-8")


def test_stream_news_returns_sse_snapshot(
    client: TestClient,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    event_loop.run_until_complete(seed_stream_articles(async_session_factory))

    with client.stream("GET", "/api/v1/stream/news?limit=1&once=true") as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")

        first_chunk = next(response.iter_text())

    assert "event: news-snapshot" in first_chunk
    data_line = next(line for line in first_chunk.splitlines() if line.startswith("data: "))
    payload = json.loads(data_line.removeprefix("data: "))
    assert payload["count"] == 1
    assert payload["items"][0]["title"] == "Stream article"


def test_stream_news_emits_continuous_updates(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def run_scenario() -> None:
        await seed_stream_articles(async_session_factory)
        bus = reset_news_stream_bus()

        event_iterator = generate_news_events(
            [
                ArticleOut(
                    id=1,
                    title="Stream article",
                    description="stream test",
                    url="https://example.com/news/stream-api",
                    source_name="Example",
                    published_at=datetime.now(timezone.utc),
                    language="en",
                ).model_dump(mode="json")
            ],
            once=False,
            max_updates=1,
        )

        first_chunk = _decode_chunk(await anext(event_iterator))
        assert "event: news-snapshot" in first_chunk

        bus.publish_articles(
            [
                ArticleOut(
                    id=2,
                    title="Live stream article",
                    description="live update",
                    url="https://example.com/news/live-stream",
                    source_name="Realtime Source",
                    published_at=datetime.now(timezone.utc),
                    language="en",
                )
            ]
        )
        full_text = _decode_chunk(await anext(event_iterator))

        assert "event: news-update" in full_text
        data_line = next(line for line in full_text.splitlines() if line.startswith("data: "))
        payload = json.loads(data_line.removeprefix("data: "))
        assert payload["tick"] == 1
        assert payload["items"][0]["title"] == "Live stream article"

    event_loop.run_until_complete(run_scenario())
