from __future__ import annotations

from app.core.config import get_settings
from app.providers.stocks.base import StockDataProvider, StockPriceBar
from app.providers.stocks.finnhub import FinnhubStockDataProvider


def get_stock_data_provider(provider_name: str | None = None) -> StockDataProvider:
    selected_provider = (provider_name or get_settings().stock_data_provider).strip().lower()
    if selected_provider == "finnhub":
        return FinnhubStockDataProvider()
    raise ValueError(f"unsupported stock data provider: {selected_provider}")


__all__ = ["StockDataProvider", "StockPriceBar", "get_stock_data_provider"]
