from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Protocol


@dataclass(slots=True)
class StockPriceBar:
    ticker: str
    time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int


class StockDataProvider(Protocol):
    provider_name: str

    async def fetch_daily_prices(
        self,
        ticker: str,
        start_at: datetime,
        end_at: datetime,
    ) -> list[StockPriceBar]: ...
