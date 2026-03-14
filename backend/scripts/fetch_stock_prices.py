from __future__ import annotations

import argparse
import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.bootstrap import initialize_database
from app.core.database import get_async_session_factory
from app.models.stock import Stock, StockPrice
from app.providers.stocks import StockDataProvider, get_stock_data_provider

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class FetchStockPriceStats:
    tickers_requested: int = 0
    tickers_succeeded: int = 0
    tickers_failed: int = 0
    price_points_fetched: int = 0
    inserted: int = 0
    updated: int = 0


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch real stock prices and store them in the database.")
    parser.add_argument("--provider", default=None, help="Stock data provider name. Defaults to STOCK_DATA_PROVIDER.")
    parser.add_argument("--ticker", action="append", default=None, help="Ticker to fetch. Repeat flag for multiple.")
    parser.add_argument("--lookback-days", type=int, default=30, help="Number of calendar days to request.")
    return parser.parse_args()


async def fetch_stock_prices(
    provider: StockDataProvider,
    session_factory: async_sessionmaker[AsyncSession],
    tickers: Sequence[str] | None = None,
    lookback_days: int = 30,
) -> FetchStockPriceStats:
    normalized_tickers = [ticker.strip().upper() for ticker in tickers or [] if ticker.strip()]
    stats = FetchStockPriceStats()
    async with session_factory() as session:
        stocks = await _load_stocks(session=session, tickers=normalized_tickers)
        stats.tickers_requested = len(stocks)
        if not stocks:
            return stats

        end_at = datetime.now(timezone.utc)
        start_at = end_at - timedelta(days=max(lookback_days, 1))
        for stock in stocks:
            try:
                price_bars = await provider.fetch_daily_prices(stock.ticker, start_at=start_at, end_at=end_at)
                fetched, inserted, updated = await _upsert_price_bars(
                    session=session,
                    stock=stock,
                    price_bars=price_bars,
                )
                stats.tickers_succeeded += 1
                stats.price_points_fetched += fetched
                stats.inserted += inserted
                stats.updated += updated
            except Exception as exc:
                stats.tickers_failed += 1
                LOGGER.warning("stock price fetch failed ticker=%s provider=%s error=%s", stock.ticker, provider.provider_name, exc)

        await session.commit()

    return stats


async def _load_stocks(session: AsyncSession, tickers: Sequence[str]) -> list[Stock]:
    statement = select(Stock).order_by(Stock.ticker.asc())
    if tickers:
        statement = statement.where(Stock.ticker.in_(tickers))
    rows = await session.scalars(statement)
    return list(rows)


async def _upsert_price_bars(
    session: AsyncSession,
    stock: Stock,
    price_bars: Sequence,
) -> tuple[int, int, int]:
    if not price_bars:
        return 0, 0, 0

    timestamps = [_normalize_utc(price_bar.time) for price_bar in price_bars]
    existing_rows = await session.scalars(
        select(StockPrice).where(StockPrice.stock_id == stock.id, StockPrice.time.in_(timestamps))
    )
    existing_by_time = {_normalize_utc(row.time): row for row in existing_rows}

    inserted = 0
    updated = 0
    for price_bar in price_bars:
        normalized_time = _normalize_utc(price_bar.time)
        current_row = existing_by_time.get(normalized_time)
        if current_row is None:
            session.add(
                StockPrice(
                    stock_id=stock.id,
                    time=normalized_time,
                    open=price_bar.open,
                    high=price_bar.high,
                    low=price_bar.low,
                    close=price_bar.close,
                    volume=price_bar.volume,
                )
            )
            inserted += 1
            continue

        current_row.open = price_bar.open
        current_row.high = price_bar.high
        current_row.low = price_bar.low
        current_row.close = price_bar.close
        current_row.volume = price_bar.volume
        updated += 1

    await session.flush()
    return len(price_bars), inserted, updated


def _normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    args = parse_arguments()
    await initialize_database()
    provider = get_stock_data_provider(args.provider)
    stats = await fetch_stock_prices(
        provider=provider,
        session_factory=get_async_session_factory(),
        tickers=args.ticker,
        lookback_days=args.lookback_days,
    )
    LOGGER.info(
        "stock price fetch finished provider=%s tickers=%d succeeded=%d failed=%d fetched=%d inserted=%d updated=%d",
        provider.provider_name,
        stats.tickers_requested,
        stats.tickers_succeeded,
        stats.tickers_failed,
        stats.price_points_fetched,
        stats.inserted,
        stats.updated,
    )


if __name__ == "__main__":
    asyncio.run(main())
