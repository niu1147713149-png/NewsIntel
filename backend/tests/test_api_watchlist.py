from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from app.core.security import create_session_token
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.bootstrap import DEFAULT_USER_EMAIL
from app.models.stock import Stock, StockPrice
from app.models.user import User


async def seed_watchlist_data(async_session_factory: async_sessionmaker[AsyncSession]) -> None:
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
                high=Decimal("101.00"),
                low=Decimal("99.00"),
                close=Decimal("100.50"),
                volume=1000,
            )
        )
        await session.commit()


def test_watchlist_add_list_remove(client, event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_watchlist_data(async_session_factory))
    client.cookies.set("newsintel_session", create_session_token(1))

    add_response = client.post("/api/v1/watchlist", json={"stock_id": 1})
    assert add_response.status_code == 200
    add_payload = add_response.json()
    assert len(add_payload["data"]) == 1
    assert add_payload["data"][0]["ticker"] == "AAPL"

    list_response = client.get("/api/v1/watchlist")
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert len(list_payload["data"]) == 1

    remove_response = client.delete("/api/v1/watchlist/1")
    assert remove_response.status_code == 200
    remove_payload = remove_response.json()
    assert remove_payload["data"] == []


def test_watchlist_add_missing_stock_returns_404(client, event_loop, async_session_factory) -> None:
    event_loop.run_until_complete(seed_watchlist_data(async_session_factory))
    client.cookies.set("newsintel_session", create_session_token(1))

    response = client.post("/api/v1/watchlist", json={"stock_id": 999})

    assert response.status_code == 404
