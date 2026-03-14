from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.common import ApiResponse


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class ArticleCategoryOut(BaseModel):
    category: CategoryOut
    confidence: float


class SentimentOut(BaseModel):
    label: Literal["positive", "negative", "neutral"]
    positive: float
    negative: float
    neutral: float
    confidence: float

    model_config = ConfigDict(from_attributes=True)


class StockImpactOut(BaseModel):
    stock_id: int
    impact_score: float
    direction: Literal["bullish", "bearish", "neutral"] | str
    confidence: float
    reasoning: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ArticleOut(BaseModel):
    id: int
    title: str
    description: str | None = None
    url: str
    source_name: str | None = None
    published_at: datetime
    language: str | None = None
    categories: list[CategoryOut] | None = None
    sentiment: SentimentOut | None = None
    impacts: list[StockImpactOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class NewsListMeta(BaseModel):
    page: int
    size: int
    total: int
    timestamp: datetime


class NewsSearchQuery(BaseModel):
    q: str | None = Field(default=None, min_length=1, max_length=300)
    category: str | None = None
    from_datetime: datetime | None = Field(default=None, alias="from")
    to_datetime: datetime | None = Field(default=None, alias="to")
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("q")
    @classmethod
    def normalize_query(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized_value = value.strip()
        return normalized_value or None

    @model_validator(mode="after")
    def validate_time_range(self) -> NewsSearchQuery:
        if self.from_datetime and self.to_datetime and self.from_datetime > self.to_datetime:
            raise ValueError("'from' must be less than or equal to 'to'")
        return self


class ArticleListResponse(ApiResponse[list[ArticleOut]]):
    meta: NewsListMeta


class ArticleDetailResponse(ApiResponse[ArticleOut]):
    pass
