from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import httpx

from app.core.config import get_settings
from app.providers.stocks.base import StockDataProvider, StockPriceBar


class FinnhubStockDataProvider(StockDataProvider):
    provider_name = "finnhub"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.finnhub_api_key:
            raise ValueError("FINNHUB_API_KEY is required when STOCK_DATA_PROVIDER=finnhub")

        self._api_key = settings.finnhub_api_key
        self._base_url = settings.finnhub_base_url.rstrip("/")
        self._timeout = settings.stock_data_timeout_seconds

    async def fetch_daily_prices(
        self,
        ticker: str,
        start_at: datetime,
        end_at: datetime,
    ) -> list[StockPriceBar]:
        params = {
            "symbol": ticker,
            "resolution": "D",
            "from": int(_normalize_utc(start_at).timestamp()),
            "to": int(_normalize_utc(end_at).timestamp()),
            "token": self._api_key,
        }

        async with httpx.AsyncClient(base_url=self._base_url, timeout=self._timeout) as client:
            response = await client.get("/stock/candle", params=params)
            response.raise_for_status()

        payload = response.json()
        status = payload.get("s")
        if status == "no_data":
            return []
        if status != "ok":
            raise RuntimeError(f"finnhub candle request failed for {ticker}: status={status}")

        opens = payload.get("o", [])
        highs = payload.get("h", [])
        lows = payload.get("l", [])
        closes = payload.get("c", [])
        volumes = payload.get("v", [])
        timestamps = payload.get("t", [])
        lengths = {len(opens), len(highs), len(lows), len(closes), len(volumes), len(timestamps)}
        if len(lengths) != 1:
            raise RuntimeError(f"finnhub returned mismatched candle arrays for {ticker}")

        bars: list[StockPriceBar] = []
        for timestamp, open_price, high_price, low_price, close_price, volume in zip(
            timestamps,
            opens,
            highs,
            lows,
            closes,
            volumes,
            strict=True,
        ):
            bars.append(
                StockPriceBar(
                    ticker=ticker,
                    time=datetime.fromtimestamp(timestamp, tz=timezone.utc),
                    open=_decimal(open_price),
                    high=_decimal(high_price),
                    low=_decimal(low_price),
                    close=_decimal(close_price),
                    volume=int(volume),
                )
            )
        return bars


def _normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _decimal(value: float | int) -> Decimal:
    return Decimal(f"{float(value):.2f}")
