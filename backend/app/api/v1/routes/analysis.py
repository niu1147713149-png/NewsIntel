from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db_session
from app.schemas.analysis import AnalysisOverviewResponse, MarketAnalysisResponse
from app.services.analysis_service import MarketAnalysisService

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/market", response_model=MarketAnalysisResponse)
async def get_market_analysis(
    window_hours: int = Query(default=24, ge=1, le=168),
    article_limit: int = Query(default=200, ge=1, le=500),
    top_stocks: int = Query(default=10, ge=1, le=50),
    latest_events: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db_session),
) -> MarketAnalysisResponse:
    service = MarketAnalysisService(db_session=db)
    aggregate_data = await service.get_market_aggregate(
        window_hours=window_hours,
        article_limit=article_limit,
        top_stocks=top_stocks,
        latest_events=latest_events,
    )
    return MarketAnalysisResponse(status="success", data=aggregate_data)


@router.get("/overview", response_model=AnalysisOverviewResponse)
async def get_analysis_overview(
    window_hours: int = Query(default=24, ge=1, le=168),
    article_limit: int = Query(default=200, ge=1, le=500),
    top_signals: int = Query(default=8, ge=1, le=50),
    db: AsyncSession = Depends(get_db_session),
) -> AnalysisOverviewResponse:
    service = MarketAnalysisService(db_session=db)
    overview_data = await service.get_overview(
        window_hours=window_hours,
        article_limit=article_limit,
        top_signals=top_signals,
    )
    return AnalysisOverviewResponse(status="success", data=overview_data)
