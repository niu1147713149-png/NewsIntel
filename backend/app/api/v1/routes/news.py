"""News list and detail API endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db_session
from app.schemas.news import ArticleDetailResponse, ArticleListResponse, NewsListMeta, NewsSearchQuery
from app.services.news_service import NewsService

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=ArticleListResponse)
async def list_news(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None),
    sentiment: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db_session),
) -> ArticleListResponse:
    """Return paginated processed news articles.

    Args:
        page: 1-based page number.
        size: Number of records per page.
        category: Optional category slug filter.
        sentiment: Optional sentiment label filter.
        db: Async database session dependency.

    Returns:
        ArticleListResponse: Standardized paginated article list response.
    """
    service = NewsService(db)
    articles, total = await service.list_articles(
        page=page,
        size=size,
        category=category,
        sentiment=sentiment,
    )
    return ArticleListResponse(
        status="success",
        data=articles,
        meta=NewsListMeta(
            page=page,
            size=size,
            total=total,
            timestamp=datetime.now(timezone.utc),
        ),
    )


@router.get("/search", response_model=ArticleListResponse)
async def search_news(
    q: str | None = Query(default=None, min_length=1, max_length=300),
    category: str | None = Query(default=None),
    from_datetime: datetime | None = Query(default=None, alias="from"),
    to_datetime: datetime | None = Query(default=None, alias="to"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
) -> ArticleListResponse:
    """Search processed news articles by keyword/category/time range.

    Args:
        q: Optional keyword for fuzzy match in title/description/content.
        category: Optional category slug filter.
        from_datetime: Optional published_at lower bound (inclusive), query key is `from`.
        to_datetime: Optional published_at upper bound (inclusive), query key is `to`.
        page: 1-based page number.
        size: Page size, limited to [1, 100].
        db: Async database session dependency.

    Returns:
        ArticleListResponse: Standardized paginated search result response.
    """
    try:
        params = NewsSearchQuery(
            q=q,
            category=category,
            from_datetime=from_datetime,
            to_datetime=to_datetime,
            page=page,
            size=size,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid search query: {exc}") from exc

    service = NewsService(db)
    articles, total = await service.search_articles(
        q=params.q,
        category=params.category,
        from_datetime=params.from_datetime,
        to_datetime=params.to_datetime,
        page=params.page,
        size=params.size,
    )
    return ArticleListResponse(
        status="success",
        data=articles,
        meta=NewsListMeta(
            page=params.page,
            size=params.size,
            total=total,
            timestamp=datetime.now(timezone.utc),
        ),
    )


@router.get("/{article_id}", response_model=ArticleDetailResponse)
async def get_news_detail(
    article_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> ArticleDetailResponse:
    """Return single processed news article detail by id.

    Args:
        article_id: Primary key of target article.
        db: Async database session dependency.

    Returns:
        ArticleDetailResponse: Standardized article detail payload.
    """
    service = NewsService(db)
    article = await service.get_article_detail(article_id=article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")

    return ArticleDetailResponse(
        status="success",
        data=article,
    )
