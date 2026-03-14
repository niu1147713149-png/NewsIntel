from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.common import ApiResponse


class SentimentAggregate(BaseModel):
    label: Literal["positive", "negative", "neutral"]
    score: float


class ImpactItem(BaseModel):
    stock_id: int
    direction: Literal["bullish", "bearish", "neutral"] | str
    score: float
    confidence: float

    model_config = ConfigDict(from_attributes=True)


class MarketPulse(BaseModel):
    value: float
    direction: Literal["bullish", "bearish", "neutral"]
    sample_size: int


class DirectionShare(BaseModel):
    direction: Literal["bullish", "bearish", "neutral"]
    count: int
    ratio: float


class StockRankingItem(BaseModel):
    stock_id: int
    ticker: str | None = None
    signal_count: int
    avg_impact_score: float
    max_abs_impact_score: float
    dominant_direction: Literal["bullish", "bearish", "neutral"]


class LatestEventItem(BaseModel):
    article_id: int
    article_title: str
    published_at: datetime
    source_name: str | None = None
    stock_id: int
    ticker: str | None = None
    direction: Literal["bullish", "bearish", "neutral"] | str
    impact_score: float
    confidence: float


class MarketAnalysisData(BaseModel):
    generated_at: datetime
    market_pulse: MarketPulse
    direction_distribution: list[DirectionShare]
    stock_rankings: list[StockRankingItem]
    latest_events: list[LatestEventItem]


class MarketAnalysisResponse(ApiResponse[MarketAnalysisData]):
    pass


class OverviewStatsCards(BaseModel):
    total_articles: int
    analyzed_sentiment_articles: int
    bullish_signals: int
    bearish_signals: int


class SentimentDistributionItem(BaseModel):
    label: Literal["positive", "negative", "neutral"]
    count: int
    ratio: float


class TopImpactSignalItem(BaseModel):
    article_id: int
    article_title: str
    published_at: datetime
    stock_id: int
    ticker: str | None = None
    direction: Literal["bullish", "bearish", "neutral"]
    impact_score: float
    confidence: float


class AnalysisOverviewData(BaseModel):
    generated_at: datetime
    stats_cards: OverviewStatsCards
    sentiment_distribution: list[SentimentDistributionItem]
    top_impact_signals: list[TopImpactSignalItem]


class AnalysisOverviewResponse(ApiResponse[AnalysisOverviewData]):
    pass
