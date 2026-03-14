from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ApiResponse
from app.schemas.stocks import StockSnapshot


AlertOperator = Literal["above", "below"]
AlertStatus = Literal["active", "triggered"]


class PriceAlertCreateRequest(BaseModel):
    stock_id: int
    operator: AlertOperator
    threshold: float = Field(gt=0)


class PriceAlertItemData(BaseModel):
    alert_id: int
    stock_id: int
    ticker: str
    stock_name: str | None = None
    operator: AlertOperator
    threshold: float
    status: AlertStatus
    is_active: bool
    triggered_at: datetime | None = None
    triggered_price: float | None = None
    is_read: bool = False
    created_at: datetime
    snapshot: StockSnapshot


class PriceAlertListResponse(ApiResponse[list[PriceAlertItemData]]):
    pass
