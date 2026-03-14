from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, PKMixin, SoftDeleteMixin, TimestampMixin


class Article(Base, PKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "articles"

    # Core fields
    external_id: Mapped[str | None] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    content: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    url_hash: Mapped[str] = mapped_column(String(32), nullable=False)
    source_name: Mapped[str | None] = mapped_column(String(255))
    source_url: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(255))
    image_url: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    language: Mapped[str | None] = mapped_column(String(5))
    country: Mapped[str | None] = mapped_column(String(2))
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    categories: Mapped[List[Category]] = relationship(
        "Category", secondary="article_categories", back_populates="articles"
    )
    sentiment: Mapped[Sentiment | None] = relationship(
        back_populates="article", cascade="all, delete-orphan", uselist=False
    )
    impacts: Mapped[List[StockImpact]] = relationship(
        back_populates="article", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_articles_published", "published_at"),
        Index("idx_articles_url_hash", "url_hash"),
        Index("idx_articles_processed", "is_processed"),
    )


class Category(Base, PKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    icon: Mapped[str | None] = mapped_column(String(64))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"))

    # Relationships
    articles: Mapped[List[Article]] = relationship(
        "Article", secondary="article_categories", back_populates="categories"
    )


class ArticleCategory(Base):
    __tablename__ = "article_categories"

    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), primary_key=True)
    confidence: Mapped[float] = mapped_column(nullable=False)

    __table_args__ = (
        CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="ck_article_categories_confidence"),
    )


class Sentiment(Base, PKMixin, TimestampMixin):
    __tablename__ = "sentiments"

    article_id: Mapped[int] = mapped_column(
        ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    label: Mapped[str] = mapped_column(String(10), nullable=False)
    positive: Mapped[float] = mapped_column(nullable=False)
    negative: Mapped[float] = mapped_column(nullable=False)
    neutral: Mapped[float] = mapped_column(nullable=False)
    confidence: Mapped[float] = mapped_column(nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(50))

    article: Mapped[Article] = relationship(back_populates="sentiment")

    __table_args__ = (
        CheckConstraint(
            "label IN ('positive','negative','neutral')",
            name="ck_sentiments_label",
        ),
        CheckConstraint(
            "positive >= 0.0 AND positive <= 1.0 AND "
            "negative >= 0.0 AND negative <= 1.0 AND "
            "neutral >= 0.0 AND neutral <= 1.0",
            name="ck_sentiments_scores_range",
        ),
    )


if TYPE_CHECKING:  # pragma: no cover
    from .stock import StockImpact
