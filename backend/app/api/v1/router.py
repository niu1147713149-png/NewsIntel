from fastapi import APIRouter

from app.api.v1.routes.analysis import router as analysis_router
from app.api.v1.routes.alerts import router as alerts_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.news import router as news_router
from app.api.v1.routes.stocks import router as stocks_router
from app.api.v1.routes.stream import router as stream_router
from app.api.v1.routes.watchlist import router as watchlist_router
from app.api.v1.routes.ws import router as ws_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(news_router)
api_v1_router.include_router(stream_router)
api_v1_router.include_router(ws_router)
api_v1_router.include_router(analysis_router)
api_v1_router.include_router(stocks_router)
api_v1_router.include_router(watchlist_router)
api_v1_router.include_router(alerts_router)
