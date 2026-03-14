from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db_session
from app.models.user import User
from app.schemas.watchlist import WatchlistCreateRequest, WatchlistResponse
from app.services.watchlist_service import WatchlistService

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("", response_model=WatchlistResponse)
async def list_watchlist(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> WatchlistResponse:
    service = WatchlistService(db_session=db)
    return WatchlistResponse(status="success", data=await service.list_items(user=current_user))


@router.post("", response_model=WatchlistResponse)
async def add_watchlist_item(
    payload: WatchlistCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> WatchlistResponse:
    service = WatchlistService(db_session=db)
    try:
        items = await service.add_item(user=current_user, stock_id=payload.stock_id)
    except ValueError as exc:
        if str(exc) == "stock_not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found") from exc
        raise
    return WatchlistResponse(status="success", data=items)


@router.delete("/{stock_id}", response_model=WatchlistResponse)
async def remove_watchlist_item(
    stock_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> WatchlistResponse:
    service = WatchlistService(db_session=db)
    return WatchlistResponse(status="success", data=await service.remove_item(user=current_user, stock_id=stock_id))
