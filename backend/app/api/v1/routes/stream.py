from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db_session
from app.schemas.news import ArticleOut
from app.services.news_stream_bus import get_news_stream_bus
from app.services.news_service import NewsService

router = APIRouter(prefix="/stream", tags=["stream"])


def _format_sse(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def generate_news_events(
    serialized_articles: list[dict[str, object]],
    *,
    once: bool,
    max_updates: int | None,
) -> AsyncIterator[str]:
    stream_bus = get_news_stream_bus()
    subscriber_queue = stream_bus.subscribe()
    yield _format_sse(
        "news-snapshot",
        {
            "items": serialized_articles,
            "count": len(serialized_articles),
        },
    )

    if once:
        stream_bus.unsubscribe(subscriber_queue)
        return

    try:
        update_count = 0
        while True:
            payload = await subscriber_queue.get()
            yield _format_sse(
                "news-update",
                {
                    "items": payload.get("items", []),
                    "count": payload.get("count", 0),
                    "tick": payload.get("tick"),
                },
            )
            update_count += 1
            if max_updates is not None and update_count >= max_updates:
                return
    finally:
        stream_bus.unsubscribe(subscriber_queue)


@router.get("/news")
async def stream_news(
    limit: int = Query(default=1, ge=1, le=5),
    once: bool = Query(default=False),
    max_updates: int | None = Query(default=None, ge=1, le=20),
    db: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    service = NewsService(db)
    articles, _ = await service.list_articles(page=1, size=limit)
    serialized_articles = [ArticleOut.model_validate(article).model_dump(mode="json") for article in articles]

    return StreamingResponse(
        generate_news_events(serialized_articles, once=once, max_updates=max_updates),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
