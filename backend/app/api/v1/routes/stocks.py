from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db_session
from app.schemas.stocks import StockDetailResponse, StockListMeta, StockListResponse, StockSyncStatusData, StockSyncStatusResponse
from app.services.stock_price_sync import get_stock_price_sync_service
from app.services.stock_price_sync_state import get_stock_price_sync_state
from app.services.stock_service import StockService

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/sync-status", response_model=StockSyncStatusResponse)
async def get_stock_sync_status() -> StockSyncStatusResponse:
    state = get_stock_price_sync_state()
    return StockSyncStatusResponse(
        status="success",
        data=StockSyncStatusData(
            enabled=state.enabled,
            running=state.running,
            provider_name=state.provider_name,
            last_started_at=state.last_started_at,
            last_finished_at=state.last_finished_at,
            last_succeeded_at=state.last_succeeded_at,
            last_error=state.last_error,
            tickers_requested=state.tickers_requested,
            tickers_succeeded=state.tickers_succeeded,
            tickers_failed=state.tickers_failed,
            price_points_fetched=state.price_points_fetched,
            inserted=state.inserted,
            updated=state.updated,
            updated_at=state.updated_at,
        ),
    )


@router.post("/sync", response_model=StockSyncStatusResponse)
async def trigger_stock_sync() -> StockSyncStatusResponse:
    sync_service = get_stock_price_sync_service()
    if sync_service.is_running:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stock sync already running")

    await sync_service.run_once()
    state = get_stock_price_sync_state()
    return StockSyncStatusResponse(
        status="success",
        data=StockSyncStatusData(
            enabled=state.enabled,
            running=state.running,
            provider_name=state.provider_name,
            last_started_at=state.last_started_at,
            last_finished_at=state.last_finished_at,
            last_succeeded_at=state.last_succeeded_at,
            last_error=state.last_error,
            tickers_requested=state.tickers_requested,
            tickers_succeeded=state.tickers_succeeded,
            tickers_failed=state.tickers_failed,
            price_points_fetched=state.price_points_fetched,
            inserted=state.inserted,
            updated=state.updated,
            updated_at=state.updated_at,
        ),
    )


@router.get("", response_model=StockListResponse)
async def list_stocks(
    q: str | None = Query(default=None, min_length=1, max_length=100),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
) -> StockListResponse:
    service = StockService(db_session=db)
    stocks, total = await service.list_stocks(q=q, page=page, size=size)
    return StockListResponse(
        status="success",
        data=stocks,
        meta=StockListMeta(
            page=page,
            size=size,
            total=total,
            timestamp=datetime.now(timezone.utc),
        ),
    )


@router.get("/{stock_id}", response_model=StockDetailResponse)
async def get_stock_detail(
    stock_id: int,
    window_hours: int = Query(default=168, ge=1, le=720),
    price_points: int = Query(default=30, ge=1, le=365),
    related_articles: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db_session),
) -> StockDetailResponse:
    service = StockService(db_session=db)
    stock_detail = await service.get_stock_detail(
        stock_id=stock_id,
        window_hours=window_hours,
        price_points=price_points,
        related_articles_limit=related_articles,
    )

    if stock_detail is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    return StockDetailResponse(status="success", data=stock_detail)
