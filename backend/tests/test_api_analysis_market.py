from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.article import Article
from app.models.stock import Stock, StockImpact


async def seed_market_analysis_data(async_session_factory: async_sessionmaker[AsyncSession]) -> None:
    current_time = datetime.now(timezone.utc)
    article_recent_1 = Article(
        title="Tech upgrade boosts chip outlook",
        description="Bullish signal",
        content="Semiconductor upgrade announced",
        url="https://example.com/news/market-agg-1",
        url_hash="urlhash-market-agg-1",
        source_name="Example Source A",
        published_at=current_time - timedelta(hours=1),
        language="en",
        country="US",
        is_processed=True,
    )
    article_recent_2 = Article(
        title="Macro uncertainty keeps volatility high",
        description="Mixed signal",
        content="Volatility persists in global markets",
        url="https://example.com/news/market-agg-2",
        url_hash="urlhash-market-agg-2",
        source_name="Example Source B",
        published_at=current_time - timedelta(hours=2),
        language="en",
        country="US",
        is_processed=True,
    )
    article_old = Article(
        title="Old signal should be excluded",
        description="Out of default window",
        content="This article is too old for default window",
        url="https://example.com/news/market-agg-3",
        url_hash="urlhash-market-agg-3",
        source_name="Example Source C",
        published_at=current_time - timedelta(hours=30),
        language="en",
        country="US",
        is_processed=True,
    )
    stock_1 = Stock(ticker="AAPL", name="Apple Inc.")
    stock_2 = Stock(ticker="TSLA", name="Tesla Inc.")

    async with async_session_factory() as db_session:
        db_session.add_all([stock_1, stock_2, article_recent_1, article_recent_2, article_old])
        await db_session.flush()
        db_session.add_all(
            [
                StockImpact(
                    article_id=article_recent_1.id,
                    stock_id=stock_1.id,
                    impact_score=0.8,
                    direction="bullish",
                    confidence=0.9,
                ),
                StockImpact(
                    article_id=article_recent_1.id,
                    stock_id=stock_2.id,
                    impact_score=-0.6,
                    direction="bearish",
                    confidence=0.8,
                ),
                StockImpact(
                    article_id=article_recent_2.id,
                    stock_id=stock_1.id,
                    impact_score=0.4,
                    direction="bullish",
                    confidence=0.5,
                ),
                StockImpact(
                    article_id=article_old.id,
                    stock_id=stock_2.id,
                    impact_score=-1.0,
                    direction="bearish",
                    confidence=1.0,
                ),
            ]
        )
        await db_session.commit()


def test_market_analysis_aggregate_success(
    client: TestClient,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    event_loop.run_until_complete(seed_market_analysis_data(async_session_factory))

    response = client.get(
        "/api/v1/analysis/market",
        params={"top_stocks": 1, "latest_events": 2},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    data = payload["data"]

    assert data["market_pulse"]["sample_size"] == 3
    assert data["market_pulse"]["direction"] == "bullish"
    assert data["market_pulse"]["value"] == 0.2

    shares = {item["direction"]: item for item in data["direction_distribution"]}
    assert shares["bullish"]["count"] == 2
    assert shares["bearish"]["count"] == 1
    assert shares["neutral"]["count"] == 0

    assert len(data["stock_rankings"]) == 1
    ranking = data["stock_rankings"][0]
    assert ranking["ticker"] == "AAPL"
    assert ranking["signal_count"] == 2
    assert ranking["dominant_direction"] == "bullish"

    assert len(data["latest_events"]) == 2
    assert all(event["article_title"] != "Old signal should be excluded" for event in data["latest_events"])


def test_market_analysis_aggregate_empty_result(client: TestClient) -> None:
    response = client.get("/api/v1/analysis/market")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    data = payload["data"]
    assert data["market_pulse"]["sample_size"] == 0
    assert data["market_pulse"]["direction"] == "neutral"
    assert data["market_pulse"]["value"] == 0.0
    assert data["stock_rankings"] == []
    assert data["latest_events"] == []
