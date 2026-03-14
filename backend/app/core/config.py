"""Application settings and configuration helpers."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    app_name: str = "NewsIntel API"
    app_version: str = "0.1.0"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./newsintel.db"
    redis_url: str = "redis://redis:6379/0"
    elasticsearch_url: str = "http://elasticsearch:9200"
    stock_data_provider: str = "finnhub"
    finnhub_api_key: str | None = None
    finnhub_base_url: str = "https://finnhub.io/api/v1"
    stock_data_timeout_seconds: float = 10.0
    stock_price_sync_enabled: bool = False
    stock_price_sync_interval_seconds: int = 1800
    stock_price_sync_lookback_days: int = 30
    session_secret_key: str = "dev-session-secret"
    session_cookie_name: str = "newsintel_session"
    frontend_origin: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance.

    Returns:
        Settings: Singleton-like settings object reused across requests.
    """
    return Settings()
