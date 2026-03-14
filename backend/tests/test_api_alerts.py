from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal

from app.core.security import create_session_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.bootstrap import DEFAULT_USER_EMAIL
from app.models.stock import Stock, StockPrice
from app.models.user import Alert, User
from app.services.alert_service import AlertService


async def seed_alert_data(async_session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with async_session_factory() as session:
        user = User(email=DEFAULT_USER_EMAIL, password_hash="x", name="Demo User", role="user")
        stock = Stock(ticker="AAPL", name="Apple Inc.", exchange="NASDAQ")
        session.add_all([user, stock])
        await session.flush()
        session.add(
            StockPrice(
                stock_id=stock.id,
                time=datetime(2026, 3, 8, tzinfo=timezone.utc),
                open=Decimal("100.00"),
                high=Decimal("103.00"),
                low=Decimal("99.00"),
                close=Decimal("101.50"),
                volume=1000,
            )
        )
        await session.commit()


def test_alerts_create_list_delete(client, event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_alert_data(async_session_factory))
    client.cookies.set("newsintel_session", create_session_token(1))

    create_response = client.post("/api/v1/alerts", json={"stock_id": 1, "operator": "above", "threshold": 105})
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert len(create_payload["data"]) == 1
    assert create_payload["data"][0]["operator"] == "above"

    list_response = client.get("/api/v1/alerts")
    assert list_response.status_code == 200
    assert len(list_response.json()["data"]) == 1

    alert_id = list_response.json()["data"][0]["alert_id"]
    delete_response = client.delete(f"/api/v1/alerts/{alert_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["data"] == []


def test_alert_service_marks_alert_triggered(event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_alert_data(async_session_factory))

    async def run_scenario() -> None:
        async with async_session_factory() as session:
            service = AlertService(db_session=session)
            user = await session.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
            assert user is not None
            await service.add_price_alert(user=user, stock_id=1, operator="above", threshold=100)

        async with async_session_factory() as session:
            service = AlertService(db_session=session)
            triggered = await service.evaluate_active_price_alerts()
            assert triggered == 1

            alert = await session.scalar(select(Alert))
            assert alert is not None
            assert alert.is_active is False

    event_loop.run_until_complete(run_scenario())


def test_notifications_mark_read_flow(client, event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_alert_data(async_session_factory))
    client.cookies.set("newsintel_session", create_session_token(1))

    async def prepare_triggered() -> None:
        async with async_session_factory() as session:
            user = await session.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
            assert user is not None
            service = AlertService(db_session=session)
            await service.add_price_alert(user=user, stock_id=1, operator="above", threshold=100)
            await service.evaluate_active_price_alerts()

    event_loop.run_until_complete(prepare_triggered())

    notifications_response = client.get("/api/v1/alerts/notifications")
    assert notifications_response.status_code == 200
    payload = notifications_response.json()
    assert len(payload["data"]) == 1
    assert payload["data"][0]["is_read"] is False

    alert_id = payload["data"][0]["alert_id"]
    mark_read_response = client.post(f"/api/v1/alerts/notifications/{alert_id}/read")
    assert mark_read_response.status_code == 200
    assert mark_read_response.json()["data"][0]["is_read"] is True


def test_alerts_evaluate_endpoint_triggers_notifications(client, event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_alert_data(async_session_factory))
    client.cookies.set("newsintel_session", create_session_token(1))

    create_response = client.post("/api/v1/alerts", json={"stock_id": 1, "operator": "above", "threshold": 100})
    assert create_response.status_code == 200
    assert create_response.json()["data"][0]["status"] == "active"

    evaluate_response = client.post("/api/v1/alerts/evaluate")
    assert evaluate_response.status_code == 200
    evaluate_payload = evaluate_response.json()["data"]
    assert len(evaluate_payload) == 1
    assert evaluate_payload[0]["status"] == "triggered"
    assert evaluate_payload[0]["is_read"] is False

    notifications_response = client.get("/api/v1/alerts/notifications?scope=unread")
    assert notifications_response.status_code == 200
    notifications_payload = notifications_response.json()["data"]
    assert len(notifications_payload) == 1
    assert notifications_payload[0]["ticker"] == "AAPL"


def test_notifications_support_sort_order(client, event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_alert_data(async_session_factory))
    client.cookies.set("newsintel_session", create_session_token(1))

    async def prepare_triggered() -> None:
        async with async_session_factory() as session:
            user = await session.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
            assert user is not None
            service = AlertService(db_session=session)
            await service.add_price_alert(user=user, stock_id=1, operator="above", threshold=100)
            await service.add_price_alert(user=user, stock_id=1, operator="above", threshold=101)
            await service.evaluate_active_price_alerts()

            alerts = list(
                (
                    await session.scalars(
                        select(Alert).where(Alert.user_id == user.id).order_by(Alert.id.asc())
                    )
                ).all()
            )
            assert len(alerts) == 2
            older_condition = json.loads(alerts[0].condition)
            newer_condition = json.loads(alerts[1].condition)
            older_condition["triggered_at"] = "2026-03-08T09:00:00+00:00"
            newer_condition["triggered_at"] = "2026-03-08T10:00:00+00:00"
            alerts[0].condition = json.dumps(older_condition)
            alerts[1].condition = json.dumps(newer_condition)
            await session.commit()

    event_loop.run_until_complete(prepare_triggered())

    newest_response = client.get("/api/v1/alerts/notifications?sort=newest")
    assert newest_response.status_code == 200
    newest_payload = newest_response.json()["data"]
    assert len(newest_payload) == 2
    assert newest_payload[0]["threshold"] == 101.0
    assert newest_payload[1]["threshold"] == 100.0

    oldest_response = client.get("/api/v1/alerts/notifications?sort=oldest")
    assert oldest_response.status_code == 200
    oldest_payload = oldest_response.json()["data"]
    assert len(oldest_payload) == 2
    assert oldest_payload[0]["threshold"] == 100.0
    assert oldest_payload[1]["threshold"] == 101.0


def test_notifications_mark_read_by_ticker(client, event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_alert_data(async_session_factory))
    client.cookies.set("newsintel_session", create_session_token(1))

    async def prepare_triggered() -> None:
        async with async_session_factory() as session:
            user = await session.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
            assert user is not None
            service = AlertService(db_session=session)
            await service.add_price_alert(user=user, stock_id=1, operator="above", threshold=100)
            await service.evaluate_active_price_alerts()

            stock = Stock(ticker="MSFT", name="Microsoft", exchange="NASDAQ")
            session.add(stock)
            await session.flush()
            session.add(
                StockPrice(
                    stock_id=stock.id,
                    time=datetime(2026, 3, 8, 1, tzinfo=timezone.utc),
                    open=Decimal("200.00"),
                    high=Decimal("203.00"),
                    low=Decimal("199.00"),
                    close=Decimal("202.50"),
                    volume=1000,
                )
            )
            await session.commit()
            await service.add_price_alert(user=user, stock_id=stock.id, operator="above", threshold=201)
            await service.evaluate_active_price_alerts()

    event_loop.run_until_complete(prepare_triggered())

    before_response = client.get("/api/v1/alerts/notifications")
    assert before_response.status_code == 200
    before_payload = before_response.json()["data"]
    assert len(before_payload) == 2
    assert sum(1 for item in before_payload if item["is_read"] is False) == 2

    mark_response = client.post("/api/v1/alerts/notifications/read-by-ticker?ticker=AAPL")
    assert mark_response.status_code == 200
    mark_payload = mark_response.json()["data"]
    assert len(mark_payload) == 1
    assert mark_payload[0]["ticker"] == "AAPL"
    assert mark_payload[0]["is_read"] is True

    after_response = client.get("/api/v1/alerts/notifications")
    assert after_response.status_code == 200
    after_payload = after_response.json()["data"]
    aapl_notification = next(item for item in after_payload if item["ticker"] == "AAPL")
    msft_notification = next(item for item in after_payload if item["ticker"] == "MSFT")
    assert aapl_notification["is_read"] is True
    assert msft_notification["is_read"] is False


def test_notifications_mark_read_filtered(client, event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_alert_data(async_session_factory))
    client.cookies.set("newsintel_session", create_session_token(1))

    async def prepare_triggered() -> None:
        async with async_session_factory() as session:
            user = await session.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
            assert user is not None
            service = AlertService(db_session=session)
            await service.add_price_alert(user=user, stock_id=1, operator="above", threshold=100)
            await service.evaluate_active_price_alerts()

            stock = Stock(ticker="MSFT", name="Microsoft", exchange="NASDAQ")
            session.add(stock)
            await session.flush()
            session.add(
                StockPrice(
                    stock_id=stock.id,
                    time=datetime(2026, 3, 8, 1, tzinfo=timezone.utc),
                    open=Decimal("200.00"),
                    high=Decimal("203.00"),
                    low=Decimal("199.00"),
                    close=Decimal("202.50"),
                    volume=1000,
                )
            )
            await session.commit()
            await service.add_price_alert(user=user, stock_id=stock.id, operator="above", threshold=201)
            await service.evaluate_active_price_alerts()

            alerts = list((await session.scalars(select(Alert).where(Alert.user_id == user.id))).all())
            for alert in alerts:
                condition = json.loads(alert.condition)
                if condition.get("ticker") == "MSFT":
                    condition["is_read"] = True
                    alert.condition = json.dumps(condition)
            await session.commit()

    event_loop.run_until_complete(prepare_triggered())

    response = client.post("/api/v1/alerts/notifications/read-filtered?scope=unread")
    assert response.status_code == 200
    payload = response.json()["data"]
    assert len(payload) == 0

    all_notifications = client.get("/api/v1/alerts/notifications").json()["data"]
    aapl_notification = next(item for item in all_notifications if item["ticker"] == "AAPL")
    msft_notification = next(item for item in all_notifications if item["ticker"] == "MSFT")
    assert aapl_notification["is_read"] is True
    assert msft_notification["is_read"] is True
