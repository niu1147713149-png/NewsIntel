from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ApiResponse
from app.schemas.stocks import StockSnapshot


class WatchlistItemData(BaseModel):
    stock_id: int
    ticker: str
    name: str | None = None
    exchange: str | None = None
    sector: str | None = None
    industry: str | None = None
    country: str | None = None
    market_cap: float | None = None
    snapshot: StockSnapshot
    added_at: datetime


class WatchlistCreateRequest(BaseModel):
    stock_id: int


class WatchlistResponse(ApiResponse[list[WatchlistItemData]]):
    pass
