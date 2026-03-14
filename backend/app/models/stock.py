from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, PKMixin, SoftDeleteMixin, TimestampMixin


class Stock(Base, PKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "stocks"

    ticker: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(String(255))
    exchange: Mapped[str | None] = mapped_column(String(32))
    sector: Mapped[str | None] = mapped_column(String(64))
    industry: Mapped[str | None] = mapped_column(String(64))
    country: Mapped[str | None] = mapped_column(String(2))
    market_cap: Mapped[float | None] = mapped_column(Numeric(20, 2))

    prices: Mapped[List[StockPrice]] = relationship(back_populates="stock", cascade="all, delete-orphan")
    impacts: Mapped[List[StockImpact]] = relationship(back_populates="stock", cascade="all, delete-orphan")


class StockPrice(Base, PKMixin):
    __tablename__ = "stock_prices"

    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), nullable=False)
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    open: Mapped[float | None]
    high: Mapped[float | None]
    low: Mapped[float | None]
    close: Mapped[float | None]
    volume: Mapped[int | None]

    stock: Mapped[Stock] = relationship(back_populates="prices")

    __table_args__ = (
        UniqueConstraint("stock_id", "time", name="uq_stock_prices_stock_time"),
        Index("idx_stock_prices_ticker_time", "stock_id", "time"),
    )


class StockImpact(Base, PKMixin, TimestampMixin):
    __tablename__ = "stock_impacts"

    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), nullable=False)
    impact_score: Mapped[float] = mapped_column(nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    confidence: Mapped[float] = mapped_column(nullable=False)
    factors: Mapped[str | None] = mapped_column(String)  # JSON serialized string (use JSONB on Postgres via migration)
    reasoning: Mapped[str | None] = mapped_column(String)

    article: Mapped["Article"] = relationship(back_populates="impacts")
    stock: Mapped[Stock] = relationship(back_populates="impacts")

    __table_args__ = (
        Index("idx_impacts_stock_created", "stock_id", "created_at"),
        Index("idx_impacts_direction", "direction"),
        UniqueConstraint("article_id", "stock_id", name="uq_impacts_article_stock"),
    )

if TYPE_CHECKING:  # pragma: no cover
    from .article import Article
