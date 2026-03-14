from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(slots=True)
class StockPriceSyncState:
    enabled: bool = False
    running: bool = False
    last_started_at: datetime | None = None
    last_finished_at: datetime | None = None
    last_succeeded_at: datetime | None = None
    last_error: str | None = None
    tickers_requested: int = 0
    tickers_succeeded: int = 0
    tickers_failed: int = 0
    price_points_fetched: int = 0
    inserted: int = 0
    updated: int = 0
    provider_name: str | None = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


_STATE = StockPriceSyncState()


def get_stock_price_sync_state() -> StockPriceSyncState:
    return _STATE


def reset_stock_price_sync_state(enabled: bool = False) -> StockPriceSyncState:
    global _STATE
    _STATE = StockPriceSyncState(enabled=enabled)
    return _STATE
