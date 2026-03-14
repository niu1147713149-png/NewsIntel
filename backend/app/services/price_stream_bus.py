from __future__ import annotations

import asyncio
from collections.abc import Iterable
from typing import Any

from app.schemas.stocks import StockListItem

Subscriber = tuple[asyncio.AbstractEventLoop, asyncio.Queue[dict[str, Any]]]

_PRICE_STREAM_BUS: "PriceStreamBus | None" = None


class PriceStreamBus:
    def __init__(self) -> None:
        self._subscribers: list[Subscriber] = []
        self._tick = 0

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        loop = asyncio.get_running_loop()
        self._subscribers.append((loop, queue))
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers = [(loop, current_queue) for loop, current_queue in self._subscribers if current_queue is not queue]

    def publish_items(self, items: Iterable[StockListItem]) -> dict[str, Any]:
        self._tick += 1
        payload: dict[str, Any] = {
            "event": "price-update",
            "items": [item.model_dump(mode="json") for item in items],
            "tick": self._tick,
        }
        payload["count"] = len(payload["items"])

        active_subscribers: list[Subscriber] = []
        for loop, queue in self._subscribers:
            if loop.is_closed():
                continue
            loop.call_soon_threadsafe(queue.put_nowait, payload)
            active_subscribers.append((loop, queue))
        self._subscribers = active_subscribers
        return payload


def get_price_stream_bus() -> PriceStreamBus:
    global _PRICE_STREAM_BUS
    if _PRICE_STREAM_BUS is None:
        _PRICE_STREAM_BUS = PriceStreamBus()
    return _PRICE_STREAM_BUS


def reset_price_stream_bus() -> PriceStreamBus:
    global _PRICE_STREAM_BUS
    _PRICE_STREAM_BUS = PriceStreamBus()
    return _PRICE_STREAM_BUS
