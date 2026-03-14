from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.article import Article, Sentiment
from app.models.stock import Stock, StockImpact


async def seed_analysis_overview_data(async_session_factory: async_sessionmaker[AsyncSession]) -> None:
    current_time = datetime.now(timezone.utc)
    article_recent_1 = Article(
        title="Chip demand jumps on AI acceleration",
        description="Positive update",
        content="AI chip demand moved higher",
        url="https://example.com/news/overview-1",
        url_hash="urlhash-overview-1",
        source_name="Example Source A",
        published_at=current_time - timedelta(hours=1),
        language="en",
        country="US",
        is_processed=True,
    )
    article_recent_2 = Article(
        title="Energy cost pressure hurts industrial margins",
        description="Negative update",
        content="Input prices stayed high",
        url="https://example.com/news/overview-2",
        url_hash="urlhash-overview-2",
        source_name="Example Source B",
        published_at=current_time - timedelta(hours=2),
        language="en",
        country="US",
        is_processed=True,
    )
    article_recent_3 = Article(
        title="Policy guidance keeps outlook stable",
        description="Neutral update",
        content="Policymakers signaled no major change",
        url="https://example.com/news/overview-3",
        url_hash="urlhash-overview-3",
        source_name="Example Source C",
        published_at=current_time - timedelta(hours=3),
        language="en",
        country="US",
        is_processed=True,
    )
    article_old = Article(
        title="Old event should be excluded from overview",
        description="Out of window",
        content="This signal is stale",
        url="https://example.com/news/overview-4",
        url_hash="urlhash-overview-4",
        source_name="Example Source D",
        published_at=current_time - timedelta(hours=36),
        language="en",
        country="US",
        is_processed=True,
    )
    stock_1 = Stock(ticker="AAPL", name="Apple Inc.")
    stock_2 = Stock(ticker="TSLA", name="Tesla Inc.")
    stock_3 = Stock(ticker="MSFT", name="Microsoft Corp.")

    async with async_session_factory() as db_session:
        db_session.add_all([stock_1, stock_2, stock_3, article_recent_1, article_recent_2, article_recent_3, article_old])
        await db_session.flush()
        db_session.add_all(
            [
                Sentiment(
                    article_id=article_recent_1.id,
                    label="positive",
                    positive=0.9,
                    negative=0.05,
                    neutral=0.05,
                    confidence=0.9,
                    model_version="test",
                ),
                Sentiment(
                    article_id=article_recent_2.id,
                    label="negative",
                    positive=0.05,
                    negative=0.9,
                    neutral=0.05,
                    confidence=0.9,
                    model_version="test",
                ),
                StockImpact(
                    article_id=article_recent_1.id,
                    stock_id=stock_1.id,
                    impact_score=0.88,
                    direction="bullish",
                    confidence=0.93,
                ),
                StockImpact(
                    article_id=article_recent_1.id,
                    stock_id=stock_2.id,
                    impact_score=0.52,
                    direction="bullish",
                    confidence=0.85,
                ),
                StockImpact(
                    article_id=article_recent_2.id,
                    stock_id=stock_2.id,
                    impact_score=-0.73,
                    direction="bearish",
                    confidence=0.87,
                ),
                StockImpact(
                    article_id=article_recent_3.id,
                    stock_id=stock_3.id,
                    impact_score=0.1,
                    direction="neutral",
                    confidence=0.65,
                ),
                StockImpact(
                    article_id=article_old.id,
                    stock_id=stock_1.id,
                    impact_score=-1.0,
                    direction="bearish",
                    confidence=1.0,
                ),
            ]
        )
        await db_session.commit()


def test_analysis_overview_success(
    client: TestClient,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    event_loop.run_until_complete(seed_analysis_overview_data(async_session_factory))

    response = client.get("/api/v1/analysis/overview", params={"top_signals": 3})

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    data = payload["data"]

    assert data["stats_cards"]["total_articles"] == 3
    assert data["stats_cards"]["analyzed_sentiment_articles"] == 2
    assert data["stats_cards"]["bullish_signals"] == 2
    assert data["stats_cards"]["bearish_signals"] == 1

    sentiments = {item["label"]: item for item in data["sentiment_distribution"]}
    assert sentiments["positive"]["count"] == 1
    assert sentiments["negative"]["count"] == 1
    assert sentiments["neutral"]["count"] == 0

    assert len(data["top_impact_signals"]) == 3
    assert data["top_impact_signals"][0]["impact_score"] == 0.88
    assert all(item["article_title"] != "Old event should be excluded from overview" for item in data["top_impact_signals"])


def test_analysis_overview_empty_result(client: TestClient) -> None:
    response = client.get("/api/v1/analysis/overview")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    data = payload["data"]

    assert data["stats_cards"]["total_articles"] == 0
    assert data["stats_cards"]["analyzed_sentiment_articles"] == 0
    assert data["stats_cards"]["bullish_signals"] == 0
    assert data["stats_cards"]["bearish_signals"] == 0
    assert data["top_impact_signals"] == []
