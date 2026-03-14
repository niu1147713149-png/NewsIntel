"""Health check endpoints."""

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.common import ApiResponse, HealthData

router = APIRouter(tags=["health"])


@router.get("/health", response_model=ApiResponse[HealthData])
async def health_check(settings: Settings = Depends(get_settings)) -> ApiResponse[HealthData]:
    """Return service health information.

    Args:
        settings: Runtime application settings injected by FastAPI.

    Returns:
        ApiResponse[HealthData]: Standardized health payload with basic metadata.
    """
    data = HealthData(
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )
    return ApiResponse(status="success", data=data)
