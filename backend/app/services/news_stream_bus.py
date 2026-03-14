from __future__ import annotations

import asyncio
from collections.abc import Iterable
from typing import Any

from app.schemas.news import ArticleOut

Subscriber = tuple[asyncio.AbstractEventLoop, asyncio.Queue[dict[str, Any]]]

_NEWS_STREAM_BUS: "NewsStreamBus | None" = None


class NewsStreamBus:
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

    def publish_articles(self, articles: Iterable[ArticleOut]) -> dict[str, Any]:
        self._tick += 1
        payload: dict[str, Any] = {
            "event": "news-update",
            "items": [article.model_dump(mode="json") for article in articles],
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


def get_news_stream_bus() -> NewsStreamBus:
    global _NEWS_STREAM_BUS
    if _NEWS_STREAM_BUS is None:
        _NEWS_STREAM_BUS = NewsStreamBus()
    return _NEWS_STREAM_BUS


def reset_news_stream_bus() -> NewsStreamBus:
    global _NEWS_STREAM_BUS
    _NEWS_STREAM_BUS = NewsStreamBus()
    return _NEWS_STREAM_BUS
