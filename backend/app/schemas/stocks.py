from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ApiResponse


class StockPricePoint(BaseModel):
    time: datetime
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None


class StockSnapshot(BaseModel):
    latest_close: float | None = None
    previous_close: float | None = None
    change: float | None = None
    change_percent: float | None = None
    last_updated_at: datetime | None = None


class StockListItem(BaseModel):
    id: int
    ticker: str
    name: str | None = None
    exchange: str | None = None
    sector: str | None = None
    industry: str | None = None
    country: str | None = None
    market_cap: float | None = None
    snapshot: StockSnapshot


class StockListMeta(BaseModel):
    page: int
    size: int
    total: int
    timestamp: datetime


class StockImpactSummary(BaseModel):
    total_signals: int
    bullish_count: int
    bearish_count: int
    neutral_count: int
    average_impact_score: float
    weighted_impact_score: float
    average_confidence: float
    overall_direction: str


class StockRelatedArticle(BaseModel):
    article_id: int
    title: str
    published_at: datetime
    source_name: str | None = None
    direction: str
    impact_score: float
    confidence: float


class StockDetailData(BaseModel):
    id: int
    ticker: str
    name: str | None = None
    exchange: str | None = None
    sector: str | None = None
    industry: str | None = None
    country: str | None = None
    market_cap: float | None = None
    snapshot: StockSnapshot
    prices: list[StockPricePoint]
    impact_summary: StockImpactSummary
    related_articles: list[StockRelatedArticle]


class StockListResponse(ApiResponse[list[StockListItem]]):
    meta: StockListMeta


class StockDetailResponse(ApiResponse[StockDetailData]):
    pass


class StockSyncStatusData(BaseModel):
    enabled: bool
    running: bool
    provider_name: str | None = None
    last_started_at: datetime | None = None
    last_finished_at: datetime | None = None
    last_succeeded_at: datetime | None = None
    last_error: str | None = None
    tickers_requested: int
    tickers_succeeded: int
    tickers_failed: int
    price_points_fetched: int
    inserted: int
    updated: int
    updated_at: datetime


class StockSyncStatusResponse(ApiResponse[StockSyncStatusData]):
    pass
