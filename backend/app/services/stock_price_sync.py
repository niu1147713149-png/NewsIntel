from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings, get_settings
from app.core.database import get_async_session_factory
from app.providers.stocks import get_stock_data_provider
from app.services.alert_service import AlertService
from app.services.price_stream_bus import get_price_stream_bus
from app.services.stock_price_sync_state import get_stock_price_sync_state
from app.services.stock_service import StockService
from scripts.fetch_stock_prices import FetchStockPriceStats, fetch_stock_prices

LOGGER = logging.getLogger(__name__)

SyncRunner = Callable[[], Awaitable[FetchStockPriceStats]]

_SYNC_SERVICE: "StockPriceSyncService | None" = None


class StockPriceSyncService:
    def __init__(
        self,
        settings: Settings | None = None,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
        sync_runner: SyncRunner | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._session_factory = session_factory or get_async_session_factory()
        self._sync_runner = sync_runner or self._build_default_runner
        self._task: asyncio.Task[None] | None = None
        self._stop_event = asyncio.Event()
        self._run_lock = asyncio.Lock()
        self._state = get_stock_price_sync_state()
        self._state.enabled = self._settings.stock_price_sync_enabled

    @property
    def enabled(self) -> bool:
        return self._settings.stock_price_sync_enabled

    def start(self) -> None:
        if not self.enabled or self._task is not None:
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if self._task is None:
            return
        self._stop_event.set()
        await self._task
        self._task = None

    @property
    def is_running(self) -> bool:
        return self._run_lock.locked() or self._state.running

    async def run_once(self) -> FetchStockPriceStats:
        async with self._run_lock:
            runner = self._sync_runner
            self._state.running = True
            self._state.last_started_at = _utcnow()
            self._state.last_error = None
            self._state.updated_at = _utcnow()
            try:
                stats = await runner()
            except Exception as exc:
                self._state.running = False
                self._state.last_finished_at = _utcnow()
                self._state.last_error = str(exc)
                self._state.updated_at = _utcnow()
                raise

            self._state.running = False
            self._state.last_finished_at = _utcnow()
            self._state.last_succeeded_at = self._state.last_finished_at
            self._state.last_error = None
            self._state.tickers_requested = stats.tickers_requested
            self._state.tickers_succeeded = stats.tickers_succeeded
            self._state.tickers_failed = stats.tickers_failed
            self._state.price_points_fetched = stats.price_points_fetched
            self._state.inserted = stats.inserted
            self._state.updated = stats.updated
            self._state.updated_at = _utcnow()
            await self._publish_latest_prices()
            return stats

    async def _run_loop(self) -> None:
        interval = max(self._settings.stock_price_sync_interval_seconds, 1)
        while not self._stop_event.is_set():
            try:
                stats = await self.run_once()
                LOGGER.info(
                    "stock price sync cycle finished tickers=%d succeeded=%d failed=%d fetched=%d inserted=%d updated=%d",
                    stats.tickers_requested,
                    stats.tickers_succeeded,
                    stats.tickers_failed,
                    stats.price_points_fetched,
                    stats.inserted,
                    stats.updated,
                )
            except Exception as exc:
                LOGGER.warning("stock price sync cycle failed: %s", exc)

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=interval)
            except TimeoutError:
                continue

    async def _build_default_runner(self) -> FetchStockPriceStats:
        provider = get_stock_data_provider(self._settings.stock_data_provider)
        self._state.provider_name = provider.provider_name
        stats = await fetch_stock_prices(
            provider=provider,
            session_factory=self._session_factory,
            lookback_days=self._settings.stock_price_sync_lookback_days,
        )
        async with self._session_factory() as session:
            alert_service = AlertService(db_session=session)
            triggered_count = await alert_service.evaluate_active_price_alerts()
            if triggered_count > 0:
                LOGGER.info("price alert evaluation finished triggered=%d", triggered_count)
        return stats

    async def _publish_latest_prices(self) -> None:
        async with self._session_factory() as session:
            stock_service = StockService(db_session=session)
            stocks, _ = await stock_service.list_stocks(page=1, size=200)

        if not stocks:
            return

        get_price_stream_bus().publish_items(stocks)


def _utcnow() -> datetime:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc)


def get_stock_price_sync_service() -> StockPriceSyncService:
    global _SYNC_SERVICE
    if _SYNC_SERVICE is None:
        _SYNC_SERVICE = StockPriceSyncService()
    return _SYNC_SERVICE


def set_stock_price_sync_service(service: StockPriceSyncService | None) -> None:
    global _SYNC_SERVICE
    _SYNC_SERVICE = service
