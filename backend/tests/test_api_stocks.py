from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.bootstrap import _ensure_recent_stock_prices
from app.models.article import Article
from app.models.stock import Stock, StockImpact, StockPrice


async def seed_stock_data(async_session_factory: async_sessionmaker[AsyncSession]) -> None:
    current_time = datetime.now(timezone.utc)
    stock_1 = Stock(ticker="AAPL", name="Apple Inc.", exchange="NASDAQ", sector="Technology")
    stock_2 = Stock(ticker="TSLA", name="Tesla Inc.", exchange="NASDAQ", sector="Automotive")
    article_recent = Article(
        title="Apple demand remains resilient",
        description="Strong launch demand",
        content="Apple demand remains healthy in key markets.",
        url="https://example.com/news/stock-1",
        url_hash="urlhash-stock-1",
        source_name="Example Source",
        published_at=current_time - timedelta(hours=4),
        language="en",
        country="US",
        is_processed=True,
    )
    article_old = Article(
        title="Old Apple note",
        description="Should be filtered by window",
        content="Old signal should not appear in default recent list.",
        url="https://example.com/news/stock-2",
        url_hash="urlhash-stock-2",
        source_name="Example Source",
        published_at=current_time - timedelta(days=10),
        language="en",
        country="US",
        is_processed=True,
    )

    async with async_session_factory() as db_session:
        db_session.add_all([stock_1, stock_2, article_recent, article_old])
        await db_session.flush()
        db_session.add_all(
            [
                StockPrice(
                    stock_id=stock_1.id,
                    time=current_time - timedelta(days=1),
                    open=190,
                    high=194,
                    low=189,
                    close=193,
                    volume=1000,
                ),
                StockPrice(
                    stock_id=stock_1.id,
                    time=current_time,
                    open=193,
                    high=197,
                    low=192,
                    close=196,
                    volume=1200,
                ),
                StockPrice(
                    stock_id=stock_2.id,
                    time=current_time,
                    open=170,
                    high=172,
                    low=166,
                    close=168,
                    volume=900,
                ),
                StockImpact(
                    article_id=article_recent.id,
                    stock_id=stock_1.id,
                    impact_score=0.7,
                    direction="bullish",
                    confidence=0.8,
                    reasoning="Demand trend remains healthy",
                ),
                StockImpact(
                    article_id=article_old.id,
                    stock_id=stock_1.id,
                    impact_score=-0.3,
                    direction="bearish",
                    confidence=0.6,
                ),
            ]
        )
        await db_session.commit()


def test_list_stocks_success(
    client: TestClient,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    event_loop.run_until_complete(seed_stock_data(async_session_factory))

    response = client.get("/api/v1/stocks", params={"q": "AAP", "page": 1, "size": 10})

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["meta"]["total"] == 1
    assert payload["data"][0]["ticker"] == "AAPL"
    assert payload["data"][0]["snapshot"]["latest_close"] == 196.0
    assert payload["data"][0]["snapshot"]["change"] == 3.0


def test_get_stock_detail_success(
    client: TestClient,
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    event_loop.run_until_complete(seed_stock_data(async_session_factory))

    response = client.get("/api/v1/stocks/1", params={"window_hours": 168, "price_points": 5, "related_articles": 5})

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    data = payload["data"]
    assert data["ticker"] == "AAPL"
    assert len(data["prices"]) == 2
    assert data["impact_summary"]["total_signals"] == 1
    assert data["impact_summary"]["overall_direction"] == "bullish"
    assert len(data["related_articles"]) == 1
    assert data["related_articles"][0]["title"] == "Apple demand remains resilient"


def test_get_stock_detail_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/stocks/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Stock not found"


def test_simulated_recent_prices_fill_five_trading_days_and_is_idempotent(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def run_scenario() -> None:
        async with async_session_factory() as db_session:
            stock = Stock(ticker="AAPL", name="Apple Inc.", exchange="NASDAQ", sector="Technology")
            db_session.add(stock)
            await db_session.flush()

            await _ensure_recent_stock_prices(
                session=db_session,
                stocks_by_ticker={"AAPL": stock},
                trading_days=5,
                anchor_date=datetime(2026, 3, 8, tzinfo=timezone.utc).date(),
            )
            await db_session.commit()

        async with async_session_factory() as db_session:
            prices_first = list(
                await db_session.scalars(select(StockPrice).where(StockPrice.stock_id == 1).order_by(StockPrice.time.asc()))
            )
            assert len(prices_first) == 5
            assert [price.time.date().isoformat() for price in prices_first] == [
                "2026-03-02",
                "2026-03-03",
                "2026-03-04",
                "2026-03-05",
                "2026-03-06",
            ]
            assert all(price.open is not None for price in prices_first)
            assert all(price.close is not None for price in prices_first)

            stock = await db_session.get(Stock, 1)
            assert stock is not None
            await _ensure_recent_stock_prices(
                session=db_session,
                stocks_by_ticker={"AAPL": stock},
                trading_days=5,
                anchor_date=datetime(2026, 3, 8, tzinfo=timezone.utc).date(),
            )
            await db_session.commit()

        async with async_session_factory() as db_session:
            prices_second = list(await db_session.scalars(select(StockPrice).where(StockPrice.stock_id == 1)))
            assert len(prices_second) == 5

    event_loop.run_until_complete(run_scenario())
