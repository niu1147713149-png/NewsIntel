"""Business logic for news list/detail retrieval."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.article import Article, Category, Sentiment
from app.models.stock import StockImpact


class NewsService:
    """Service handling read-only news queries."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize service with async database session.

        Args:
            db: Active SQLAlchemy async session.

        Returns:
            None: Constructor does not return value.
        """
        self._db = db

    async def list_articles(
        self,
        page: int = 1,
        size: int = 20,
        category: str | None = None,
        sentiment: str | None = None,
    ) -> tuple[list[Article], int]:
        """Fetch processed, non-deleted articles with optional filters and pagination.

        Args:
            page: 1-based page number.
            size: Page size.
            category: Optional category slug filter.
            sentiment: Optional sentiment label filter.

        Returns:
            tuple[list[Article], int]: List of articles and total matched record count.
        """
        base_query = (
            select(Article)
            .where(Article.is_deleted.is_(False), Article.is_processed.is_(True))
            .options(
                selectinload(Article.categories),
                selectinload(Article.sentiment),
                selectinload(Article.impacts).selectinload(StockImpact.stock),
            )
            .order_by(Article.published_at.desc())
        )

        if category:
            base_query = base_query.join(Article.categories).where(Category.slug == category)

        if sentiment:
            base_query = base_query.join(Article.sentiment).where(Sentiment.label == sentiment)

        count_query = select(func.count()).select_from(base_query.distinct().subquery())
        total = int(await self._db.scalar(count_query) or 0)

        page_query = base_query.distinct().offset((page - 1) * size).limit(size)
        result = await self._db.execute(page_query)
        articles = list(result.scalars().all())
        return articles, total

    async def get_article_detail(self, article_id: int) -> Article | None:
        """Fetch a single processed article by ID.

        Args:
            article_id: Target article primary key.

        Returns:
            Article | None: Article entity when found, otherwise None.
        """
        query = (
            select(Article)
            .where(
                Article.id == article_id,
                Article.is_deleted.is_(False),
                Article.is_processed.is_(True),
            )
            .options(
                selectinload(Article.categories),
                selectinload(Article.sentiment),
                selectinload(Article.impacts).selectinload(StockImpact.stock),
            )
        )
        result = await self._db.execute(query)
        return result.scalar_one_or_none()

    async def search_articles(
        self,
        q: str | None = None,
        category: str | None = None,
        from_datetime: datetime | None = None,
        to_datetime: datetime | None = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[list[Article], int]:
        """Search processed news articles by keyword, category, and publish time window.

        Args:
            q: Keyword for fuzzy search in title/description/content.
            category: Optional category slug filter.
            from_datetime: Optional lower bound for published time (inclusive).
            to_datetime: Optional upper bound for published time (inclusive).
            page: 1-based page number.
            size: Number of records per page.

        Returns:
            tuple[list[Article], int]: Matched articles and total count before pagination.
        """
        base_query = (
            select(Article)
            .where(Article.is_deleted.is_(False), Article.is_processed.is_(True))
            .options(
                selectinload(Article.categories),
                selectinload(Article.sentiment),
                selectinload(Article.impacts).selectinload(StockImpact.stock),
            )
            .order_by(Article.published_at.desc())
        )

        if q:
            keyword = f"%{q.strip()}%"
            base_query = base_query.where(
                or_(
                    Article.title.ilike(keyword),
                    Article.description.ilike(keyword),
                    Article.content.ilike(keyword),
                )
            )

        if category:
            base_query = base_query.join(Article.categories).where(Category.slug == category)

        if from_datetime:
            base_query = base_query.where(Article.published_at >= from_datetime)

        if to_datetime:
            base_query = base_query.where(Article.published_at <= to_datetime)

        count_query = select(func.count()).select_from(base_query.distinct().subquery())
        total = int(await self._db.scalar(count_query) or 0)

        page_query = base_query.distinct().offset((page - 1) * size).limit(size)
        result = await self._db.execute(page_query)
        articles = list(result.scalars().all())
        return articles, total
