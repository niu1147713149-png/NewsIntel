from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db_session
from app.services.price_stream_bus import get_price_stream_bus
from app.services.stock_service import StockService

router = APIRouter(prefix="/ws", tags=["ws"])


def _filter_subscription_items(items: list[dict[str, Any]], stock_ids: set[int]) -> list[dict[str, Any]]:
    if not stock_ids:
        return items
    return [item for item in items if item.get("id") in stock_ids]


@router.websocket("/prices")
async def prices_websocket(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db_session),
    limit: int = Query(default=5, ge=1, le=20),
    stock_ids: str | None = Query(default=None),
) -> None:
    await websocket.accept()
    service = StockService(db_session=db)
    stocks, _ = await service.list_stocks(page=1, size=limit)
    requested_stock_ids = {
        int(raw_stock_id)
        for raw_stock_id in (stock_ids or "").split(",")
        if raw_stock_id.strip().isdigit()
    }

    if requested_stock_ids:
        stocks = [stock for stock in stocks if stock.id in requested_stock_ids]

    snapshot_items = [item.model_dump(mode="json") for item in stocks]
    subscription = {
        "stock_ids": sorted(requested_stock_ids),
    }
    stream_bus = get_price_stream_bus()
    subscriber_queue = stream_bus.subscribe()

    await websocket.send_text(
        json.dumps(
            {
                "event": "price-snapshot",
                "items": snapshot_items,
                "count": len(snapshot_items),
                "subscription": subscription,
            },
            ensure_ascii=False,
        )
    )

    try:
        while True:
            payload = await subscriber_queue.get()
            filtered_items = _filter_subscription_items(payload.get("items", []), requested_stock_ids)
            if requested_stock_ids and not filtered_items:
                continue

            await websocket.send_text(
                json.dumps(
                    {
                        "event": "price-update",
                        "items": filtered_items,
                        "count": len(filtered_items),
                        "tick": payload.get("tick"),
                        "subscription": subscription,
                    },
                    ensure_ascii=False,
                )
            )
    except WebSocketDisconnect:
        stream_bus.unsubscribe(subscriber_queue)
        return
