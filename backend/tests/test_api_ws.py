from __future__ import annotations

import json

from app.schemas.stocks import StockListItem, StockSnapshot
from app.services.price_stream_bus import reset_price_stream_bus


def test_prices_websocket_returns_snapshot(client) -> None:
    with client.websocket_connect("/api/v1/ws/prices?limit=2") as websocket:
        message = websocket.receive_text()

    payload = json.loads(message)
    assert payload["event"] == "price-snapshot"
    assert isinstance(payload["count"], int)
    assert isinstance(payload["items"], list)
    assert payload["subscription"]["stock_ids"] == []


def test_prices_websocket_filters_by_stock_ids(client) -> None:
    with client.websocket_connect("/api/v1/ws/prices?limit=10&stock_ids=1") as websocket:
        message = websocket.receive_text()

    payload = json.loads(message)
    assert payload["event"] == "price-snapshot"
    assert payload["subscription"]["stock_ids"] == [1]
    assert all(item["id"] == 1 for item in payload["items"])


def test_prices_websocket_emits_continuous_updates(client) -> None:
    bus = reset_price_stream_bus()

    with client.websocket_connect("/api/v1/ws/prices?limit=2") as websocket:
        websocket.receive_text()
        bus.publish_items(
            [
                StockListItem(
                    id=1,
                    ticker="AAPL",
                    name="Apple Inc.",
                    snapshot=StockSnapshot(
                        latest_close=205.5,
                        previous_close=200.0,
                        change=5.5,
                        change_percent=2.75,
                    ),
                )
            ]
        )
        update_message = websocket.receive_text()

    payload = json.loads(update_message)
    assert payload["event"] == "price-update"
    assert payload["tick"] == 1
    assert isinstance(payload["items"], list)
    assert payload["items"][0]["ticker"] == "AAPL"
