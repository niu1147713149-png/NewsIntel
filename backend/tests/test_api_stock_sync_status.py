from __future__ import annotations

from datetime import datetime, timezone

from app.services.stock_price_sync import StockPriceSyncService, set_stock_price_sync_service
from app.services.stock_price_sync_state import reset_stock_price_sync_state
from scripts.fetch_stock_prices import FetchStockPriceStats


def test_stock_sync_status_endpoint_returns_current_state(client) -> None:
    state = reset_stock_price_sync_state(enabled=True)
    state.running = False
    state.provider_name = "finnhub"
    state.last_started_at = datetime(2026, 3, 8, 10, 0, tzinfo=timezone.utc)
    state.last_finished_at = datetime(2026, 3, 8, 10, 1, tzinfo=timezone.utc)
    state.last_succeeded_at = datetime(2026, 3, 8, 10, 1, tzinfo=timezone.utc)
    state.tickers_requested = 2
    state.tickers_succeeded = 2
    state.tickers_failed = 0
    state.price_points_fetched = 12
    state.inserted = 8
    state.updated = 4
    state.updated_at = datetime(2026, 3, 8, 10, 1, tzinfo=timezone.utc)

    response = client.get("/api/v1/stocks/sync-status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["enabled"] is True
    assert payload["data"]["provider_name"] == "finnhub"
    assert payload["data"]["tickers_requested"] == 2
    assert payload["data"]["inserted"] == 8


def test_stock_sync_trigger_endpoint_runs_sync(client, event_loop) -> None:
    state = reset_stock_price_sync_state(enabled=True)

    async def fake_runner() -> FetchStockPriceStats:
        state.provider_name = "fake"
        return FetchStockPriceStats(tickers_requested=1, tickers_succeeded=1, price_points_fetched=5, inserted=5)

    service = StockPriceSyncService(sync_runner=fake_runner)
    set_stock_price_sync_service(service)

    try:
        response = client.post("/api/v1/stocks/sync")
    finally:
        set_stock_price_sync_service(None)

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["provider_name"] == "fake"
    assert payload["data"]["tickers_requested"] == 1
    assert payload["data"]["inserted"] == 5


def test_stock_sync_trigger_endpoint_rejects_when_running(client) -> None:
    state = reset_stock_price_sync_state(enabled=True)
    state.running = True

    async def fake_runner() -> FetchStockPriceStats:
        return FetchStockPriceStats()

    service = StockPriceSyncService(sync_runner=fake_runner)
    set_stock_price_sync_service(service)

    try:
        response = client.post("/api/v1/stocks/sync")
    finally:
        set_stock_price_sync_service(None)
        state.running = False

    assert response.status_code == 409
