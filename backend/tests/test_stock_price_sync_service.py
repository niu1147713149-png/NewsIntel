from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from app.core.config import Settings
from app.models.stock import Stock, StockPrice
from app.services.price_stream_bus import reset_price_stream_bus
from app.services.stock_price_sync import StockPriceSyncService
from scripts.fetch_stock_prices import FetchStockPriceStats


def test_sync_service_run_once_uses_runner(event_loop: asyncio.AbstractEventLoop) -> None:
    calls = 0

    async def fake_runner() -> FetchStockPriceStats:
        nonlocal calls
        calls += 1
        return FetchStockPriceStats(tickers_requested=2, tickers_succeeded=2, price_points_fetched=8, inserted=8)

    async def run_scenario() -> None:
        service = StockPriceSyncService(
            settings=Settings(stock_price_sync_enabled=True, stock_price_sync_interval_seconds=60),
            sync_runner=fake_runner,
        )
        stats = await service.run_once()
        assert calls == 1
        assert stats.tickers_requested == 2
        assert stats.inserted == 8

    event_loop.run_until_complete(run_scenario())


def test_sync_service_background_loop_runs_until_stopped(event_loop: asyncio.AbstractEventLoop) -> None:
    calls = 0
    stop_after = asyncio.Event()

    async def fake_runner() -> FetchStockPriceStats:
        nonlocal calls
        calls += 1
        if calls >= 2:
            stop_after.set()
        return FetchStockPriceStats(tickers_requested=1, tickers_succeeded=1, price_points_fetched=2, inserted=2)

    async def run_scenario() -> None:
        service = StockPriceSyncService(
            settings=Settings(stock_price_sync_enabled=True, stock_price_sync_interval_seconds=1),
            sync_runner=fake_runner,
        )
        service.start()
        await asyncio.wait_for(stop_after.wait(), timeout=3)
        await service.stop()
        assert calls >= 2

    event_loop.run_until_complete(run_scenario())


def test_sync_service_publishes_latest_prices(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory,
) -> None:
    async def seed_data() -> None:
        now = datetime.now(timezone.utc)
        async with async_session_factory() as session:
            stock = Stock(ticker="AAPL", name="Apple Inc.", exchange="NASDAQ")
            session.add(stock)
            await session.flush()
            session.add_all(
                [
                    StockPrice(stock_id=stock.id, time=now - timedelta(days=1), open=190, high=193, low=189, close=192, volume=1000),
                    StockPrice(stock_id=stock.id, time=now, open=192, high=196, low=191, close=195, volume=1200),
                ]
            )
            await session.commit()

    async def fake_runner() -> FetchStockPriceStats:
        return FetchStockPriceStats(tickers_requested=1, tickers_succeeded=1, price_points_fetched=2, inserted=2)

    async def run_scenario() -> None:
        await seed_data()
        bus = reset_price_stream_bus()
        subscriber = bus.subscribe()
        service = StockPriceSyncService(
            settings=Settings(stock_price_sync_enabled=True, stock_price_sync_interval_seconds=60),
            session_factory=async_session_factory,
            sync_runner=fake_runner,
        )

        try:
            await service.run_once()
            payload = await asyncio.wait_for(subscriber.get(), timeout=1)
        finally:
            bus.unsubscribe(subscriber)

        assert payload["event"] == "price-update"
        assert payload["count"] == 1
        assert payload["items"][0]["ticker"] == "AAPL"
        assert payload["items"][0]["snapshot"]["latest_close"] == 195.0

    event_loop.run_until_complete(run_scenario())
