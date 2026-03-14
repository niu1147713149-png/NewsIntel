from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.stock import Stock, StockPrice
from app.providers.stocks.base import StockPriceBar
from scripts.fetch_stock_prices import fetch_stock_prices


class FakeStockDataProvider:
    provider_name = "fake"

    def __init__(self) -> None:
        self.calls: list[str] = []

    async def fetch_daily_prices(
        self,
        ticker: str,
        start_at: datetime,
        end_at: datetime,
    ) -> list[StockPriceBar]:
        self.calls.append(ticker)
        anchor = datetime(2026, 3, 6, tzinfo=timezone.utc)
        return [
            StockPriceBar(
                ticker=ticker,
                time=anchor,
                open=Decimal("100.00"),
                high=Decimal("102.50"),
                low=Decimal("99.80"),
                close=Decimal("101.25"),
                volume=1_200_000,
            ),
            StockPriceBar(
                ticker=ticker,
                time=anchor + timedelta(days=1),
                open=Decimal("101.25"),
                high=Decimal("104.10"),
                low=Decimal("100.75"),
                close=Decimal("103.80"),
                volume=1_350_000,
            ),
        ]


def _seed_stocks(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def run_seed() -> None:
        async with async_session_factory() as session:
            session.add_all(
                [
                    Stock(ticker="AAPL", name="Apple Inc."),
                    Stock(ticker="NVDA", name="NVIDIA Corp."),
                ]
            )
            await session.commit()

    event_loop.run_until_complete(run_seed())


def test_fetch_stock_prices_inserts_missing_rows(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _seed_stocks(event_loop, async_session_factory)
    provider = FakeStockDataProvider()

    async def run_scenario() -> None:
        stats = await fetch_stock_prices(
            provider=provider,
            session_factory=async_session_factory,
            tickers=["AAPL"],
            lookback_days=10,
        )
        assert stats.tickers_requested == 1
        assert stats.tickers_succeeded == 1
        assert stats.tickers_failed == 0
        assert stats.price_points_fetched == 2
        assert stats.inserted == 2
        assert stats.updated == 0

        async with async_session_factory() as session:
            prices = list(await session.scalars(select(StockPrice).order_by(StockPrice.time.asc())))
            assert len(prices) == 2
            assert float(prices[0].close) == pytest.approx(101.25)
            assert prices[1].volume == 1_350_000

    event_loop.run_until_complete(run_scenario())


def test_fetch_stock_prices_updates_existing_rows(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _seed_stocks(event_loop, async_session_factory)
    provider = FakeStockDataProvider()

    async def run_scenario() -> None:
        async with async_session_factory() as session:
            stock = await session.scalar(select(Stock).where(Stock.ticker == "AAPL"))
            assert stock is not None
            session.add(
                StockPrice(
                    stock_id=stock.id,
                    time=datetime(2026, 3, 6, tzinfo=timezone.utc),
                    open=Decimal("90.00"),
                    high=Decimal("91.00"),
                    low=Decimal("89.00"),
                    close=Decimal("90.50"),
                    volume=900_000,
                )
            )
            await session.commit()

        stats = await fetch_stock_prices(
            provider=provider,
            session_factory=async_session_factory,
            tickers=["AAPL"],
            lookback_days=10,
        )
        assert stats.inserted == 1
        assert stats.updated == 1

        async with async_session_factory() as session:
            prices = list(await session.scalars(select(StockPrice).order_by(StockPrice.time.asc())))
            assert len(prices) == 2
            assert float(prices[0].close) == pytest.approx(101.25)

    event_loop.run_until_complete(run_scenario())


def test_fetch_stock_prices_continues_when_single_ticker_fails(
    event_loop: asyncio.AbstractEventLoop,
    async_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    _seed_stocks(event_loop, async_session_factory)

    class PartiallyFailingProvider(FakeStockDataProvider):
        async def fetch_daily_prices(
            self,
            ticker: str,
            start_at: datetime,
            end_at: datetime,
        ) -> list[StockPriceBar]:
            if ticker == "NVDA":
                raise RuntimeError("boom")
            return await super().fetch_daily_prices(ticker, start_at, end_at)

    provider = PartiallyFailingProvider()

    async def run_scenario() -> None:
        stats = await fetch_stock_prices(provider=provider, session_factory=async_session_factory, lookback_days=10)
        assert stats.tickers_requested == 2
        assert stats.tickers_succeeded == 1
        assert stats.tickers_failed == 1

        async with async_session_factory() as session:
            prices = list(await session.scalars(select(StockPrice)))
            assert len(prices) == 2

    event_loop.run_until_complete(run_scenario())
