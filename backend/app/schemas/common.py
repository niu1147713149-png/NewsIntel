"""Common API response schemas."""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Generic API response wrapper."""

    status: str
    data: T
    meta: dict[str, str] | None = None

    model_config = ConfigDict(from_attributes=True)


class HealthData(BaseModel):
    """Health endpoint payload."""

    service: str
    version: str
    environment: str
