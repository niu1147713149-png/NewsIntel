from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Stock
from app.models.user import Alert, User
from app.schemas.alerts import AlertOperator, PriceAlertItemData
from app.services.stock_service import StockService


class AlertService:
    def __init__(self, db_session: AsyncSession) -> None:
        self._db = db_session
        self._stock_service = StockService(db_session=db_session)

    async def list_price_alerts(self, user: User) -> list[PriceAlertItemData]:
        alerts = list(
            (
                await self._db.scalars(
                    select(Alert)
                    .where(Alert.user_id == user.id, Alert.type == "price_threshold")
                    .order_by(Alert.created_at.desc())
                )
            ).all()
        )
        if not alerts:
            return []

        stock_ids = sorted({self._decode_condition(alert.condition)["stock_id"] for alert in alerts})
        stocks = list(
            (
                await self._db.scalars(
                    select(Stock)
                    .where(Stock.id.in_(stock_ids), Stock.is_deleted.is_(False))
                    .options(selectinload(Stock.prices))
                )
            ).all()
        )
        stocks_by_id = {stock.id: stock for stock in stocks}

        items: list[PriceAlertItemData] = []
        for alert in alerts:
            condition = self._decode_condition(alert.condition)
            stock = stocks_by_id.get(condition["stock_id"])
            if stock is None:
                continue
            snapshot = self._stock_service._build_stock_list_item(stock).snapshot
            items.append(
                PriceAlertItemData(
                    alert_id=alert.id,
                    stock_id=stock.id,
                    ticker=stock.ticker,
                    stock_name=stock.name,
                    operator=condition["operator"],
                    threshold=float(condition["threshold"]),
                    status="active" if alert.is_active else "triggered",
                    is_active=alert.is_active,
                    triggered_at=_parse_datetime(condition.get("triggered_at")),
                    triggered_price=(
                        float(condition["triggered_price"]) if condition.get("triggered_price") is not None else None
                    ),
                    is_read=bool(condition.get("is_read", False)),
                    created_at=alert.created_at,
                    snapshot=snapshot,
                )
            )
        return items

    async def add_price_alert(
        self,
        user: User,
        stock_id: int,
        operator: AlertOperator,
        threshold: float,
    ) -> list[PriceAlertItemData]:
        stock = await self._db.scalar(select(Stock).where(Stock.id == stock_id, Stock.is_deleted.is_(False)))
        if stock is None:
            raise ValueError("stock_not_found")

        condition = json.dumps(
            {
                "stock_id": stock.id,
                "ticker": stock.ticker,
                "operator": operator,
                "threshold": round(float(threshold), 4),
                "triggered_at": None,
                "triggered_price": None,
                "is_read": False,
            }
        )
        self._db.add(Alert(user_id=user.id, type="price_threshold", condition=condition, is_active=True))
        await self._db.commit()
        return await self.list_price_alerts(user=user)

    async def remove_alert(self, user: User, alert_id: int) -> list[PriceAlertItemData]:
        await self._db.execute(delete(Alert).where(Alert.user_id == user.id, Alert.id == alert_id))
        await self._db.commit()
        return await self.list_price_alerts(user=user)

    async def evaluate_active_price_alerts(self) -> int:
        alerts = list(
            (
                await self._db.scalars(
                    select(Alert).where(Alert.type == "price_threshold", Alert.is_active.is_(True))
                )
            ).all()
        )
        if not alerts:
            return 0

        stock_ids = sorted({self._decode_condition(alert.condition)["stock_id"] for alert in alerts})
        stocks = list(
            (
                await self._db.scalars(
                    select(Stock)
                    .where(Stock.id.in_(stock_ids), Stock.is_deleted.is_(False))
                    .options(selectinload(Stock.prices))
                )
            ).all()
        )
        stocks_by_id = {stock.id: stock for stock in stocks}
        triggered_count = 0

        for alert in alerts:
            condition = self._decode_condition(alert.condition)
            stock = stocks_by_id.get(condition["stock_id"])
            if stock is None or not stock.prices:
                continue
            latest_price = sorted(stock.prices, key=lambda item: item.time)[-1]
            if latest_price.close is None:
                continue
            latest_close = float(latest_price.close)
            operator = condition["operator"]
            threshold = float(condition["threshold"])
            is_triggered = (operator == "above" and latest_close >= threshold) or (
                operator == "below" and latest_close <= threshold
            )
            if not is_triggered:
                continue

            condition["triggered_at"] = datetime.now(timezone.utc).isoformat()
            condition["triggered_price"] = round(latest_close, 4)
            condition["is_read"] = False
            alert.condition = json.dumps(condition)
            alert.is_active = False
            triggered_count += 1

        if triggered_count > 0:
            await self._db.commit()
        return triggered_count

    async def list_notifications(
        self,
        user: User,
        unread_only: bool = False,
        ticker: str | None = None,
        sort_order: str = "newest",
    ) -> list[PriceAlertItemData]:
        alerts = await self.list_price_alerts(user=user)
        notifications = [alert for alert in alerts if alert.status == "triggered"]
        if unread_only:
            notifications = [alert for alert in notifications if not alert.is_read]
        if ticker:
            normalized_ticker = ticker.strip().upper()
            notifications = [alert for alert in notifications if alert.ticker.upper() == normalized_ticker]
        reverse = sort_order != "oldest"
        notifications.sort(
            key=lambda item: item.triggered_at.isoformat() if item.triggered_at is not None else "",
            reverse=reverse,
        )
        return notifications

    async def mark_notification_read(self, user: User, alert_id: int) -> list[PriceAlertItemData]:
        alert = await self._db.scalar(select(Alert).where(Alert.user_id == user.id, Alert.id == alert_id, Alert.is_active.is_(False)))
        if alert is None:
            return await self.list_notifications(user=user)
        condition = self._decode_condition(alert.condition)
        condition["is_read"] = True
        alert.condition = json.dumps(condition)
        await self._db.commit()
        return await self.list_notifications(user=user)

    async def mark_all_notifications_read(self, user: User) -> list[PriceAlertItemData]:
        alerts = list(
            (
                await self._db.scalars(
                    select(Alert).where(Alert.user_id == user.id, Alert.type == "price_threshold", Alert.is_active.is_(False))
                )
            ).all()
        )
        for alert in alerts:
            condition = self._decode_condition(alert.condition)
            condition["is_read"] = True
            alert.condition = json.dumps(condition)
        if alerts:
            await self._db.commit()
        return await self.list_notifications(user=user)

    async def mark_notifications_read_by_ticker(self, user: User, ticker: str) -> list[PriceAlertItemData]:
        normalized_ticker = ticker.strip().upper()
        if not normalized_ticker:
            return await self.list_notifications(user=user)

        alerts = list(
            (
                await self._db.scalars(
                    select(Alert).where(Alert.user_id == user.id, Alert.type == "price_threshold", Alert.is_active.is_(False))
                )
            ).all()
        )
        changed = False
        for alert in alerts:
            condition = self._decode_condition(alert.condition)
            if str(condition.get("ticker", "")).strip().upper() != normalized_ticker:
                continue
            if condition.get("is_read") is True:
                continue
            condition["is_read"] = True
            alert.condition = json.dumps(condition)
            changed = True
        if changed:
            await self._db.commit()
        return await self.list_notifications(user=user, ticker=normalized_ticker)

    async def mark_notifications_read_by_filter(
        self,
        user: User,
        unread_only: bool = False,
        ticker: str | None = None,
        sort_order: str = "newest",
    ) -> list[PriceAlertItemData]:
        notifications = await self.list_notifications(
            user=user,
            unread_only=unread_only,
            ticker=ticker,
            sort_order=sort_order,
        )
        target_ids = {item.alert_id for item in notifications}
        if not target_ids:
            return notifications

        alerts = list(
            (
                await self._db.scalars(
                    select(Alert).where(Alert.user_id == user.id, Alert.type == "price_threshold", Alert.is_active.is_(False))
                )
            ).all()
        )
        changed = False
        for alert in alerts:
            if alert.id not in target_ids:
                continue
            condition = self._decode_condition(alert.condition)
            if condition.get("is_read") is True:
                continue
            condition["is_read"] = True
            alert.condition = json.dumps(condition)
            changed = True

        if changed:
            await self._db.commit()

        return await self.list_notifications(
            user=user,
            unread_only=unread_only,
            ticker=ticker,
            sort_order=sort_order,
        )

    @staticmethod
    def _decode_condition(raw_condition: str) -> dict[str, object]:
        return json.loads(raw_condition)


def _parse_datetime(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
