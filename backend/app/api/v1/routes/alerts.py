from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db_session
from app.models.user import User
from app.schemas.alerts import PriceAlertCreateRequest, PriceAlertListResponse
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=PriceAlertListResponse)
async def list_alerts(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    return PriceAlertListResponse(status="success", data=await service.list_price_alerts(user=current_user))


@router.post("", response_model=PriceAlertListResponse)
async def create_alert(
    payload: PriceAlertCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    try:
        alerts = await service.add_price_alert(
            user=current_user,
            stock_id=payload.stock_id,
            operator=payload.operator,
            threshold=payload.threshold,
        )
    except ValueError as exc:
        if str(exc) == "stock_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found") from exc
        raise
    return PriceAlertListResponse(status="success", data=alerts)


@router.delete("/{alert_id}", response_model=PriceAlertListResponse)
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    return PriceAlertListResponse(status="success", data=await service.remove_alert(user=current_user, alert_id=alert_id))


@router.post("/evaluate", response_model=PriceAlertListResponse)
async def evaluate_alerts(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    await service.evaluate_active_price_alerts()
    return PriceAlertListResponse(status="success", data=await service.list_price_alerts(user=current_user))


@router.get("/notifications", response_model=PriceAlertListResponse)
async def list_notifications(
    scope: str = Query(default="all", pattern="^(all|unread)$"),
    ticker: str | None = Query(default=None, min_length=1, max_length=16),
    sort: str = Query(default="newest", pattern="^(newest|oldest)$"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    return PriceAlertListResponse(
        status="success",
        data=await service.list_notifications(
            user=current_user,
            unread_only=scope == "unread",
            ticker=ticker,
            sort_order=sort,
        ),
    )


@router.post("/notifications/{alert_id}/read", response_model=PriceAlertListResponse)
async def mark_notification_read(
    alert_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    return PriceAlertListResponse(status="success", data=await service.mark_notification_read(user=current_user, alert_id=alert_id))


@router.post("/notifications/read-all", response_model=PriceAlertListResponse)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    return PriceAlertListResponse(status="success", data=await service.mark_all_notifications_read(user=current_user))


@router.post("/notifications/read-by-ticker", response_model=PriceAlertListResponse)
async def mark_notifications_read_by_ticker(
    ticker: str = Query(..., min_length=1, max_length=16),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    return PriceAlertListResponse(
        status="success",
        data=await service.mark_notifications_read_by_ticker(user=current_user, ticker=ticker),
    )


@router.post("/notifications/read-filtered", response_model=PriceAlertListResponse)
async def mark_notifications_read_filtered(
    scope: str = Query(default="all", pattern="^(all|unread)$"),
    ticker: str | None = Query(default=None, min_length=1, max_length=16),
    sort: str = Query(default="newest", pattern="^(newest|oldest)$"),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PriceAlertListResponse:
    service = AlertService(db_session=db)
    return PriceAlertListResponse(
        status="success",
        data=await service.mark_notifications_read_by_filter(
            user=current_user,
            unread_only=scope == "unread",
            ticker=ticker,
            sort_order=sort,
        ),
    )
