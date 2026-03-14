"""FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.bootstrap import initialize_database
from app.core.config import get_settings
from app.services.stock_price_sync import get_stock_price_sync_service


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Run startup bootstrap tasks before serving requests.

    Args:
        _: FastAPI application instance injected by FastAPI lifespan hook.

    Returns:
        AsyncIterator[None]: Lifespan context used by FastAPI runtime.
    """
    await initialize_database()
    sync_service = get_stock_price_sync_service()
    sync_service.start()
    yield
    await sync_service.stop()


def create_app() -> FastAPI:
    """Create and configure FastAPI application.

    Returns:
        FastAPI: Configured application instance.
    """
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_v1_router, prefix="/api/v1")
    return app


app = create_app()
