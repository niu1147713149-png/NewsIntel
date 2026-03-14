from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.stock import Stock, StockImpact, StockPrice
from app.schemas.stocks import (
    StockDetailData,
    StockImpactSummary,
    StockListItem,
    StockPricePoint,
    StockRelatedArticle,
    StockSnapshot,
)


def _ensure_utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class StockService:
    def __init__(self, db_session: AsyncSession) -> None:
        self._db = db_session

    async def list_stocks(
        self,
        q: str | None = None,
        page: int = 1,
        size: int = 20,
    ) -> tuple[list[StockListItem], int]:
        base_query = (
            select(Stock)
            .where(Stock.is_deleted.is_(False))
            .options(selectinload(Stock.prices))
            .order_by(Stock.ticker.asc())
        )

        if q:
            keyword = f"%{q.strip()}%"
            base_query = base_query.where(or_(Stock.ticker.ilike(keyword), Stock.name.ilike(keyword)))

        count_query = select(func.count()).select_from(base_query.subquery())
        total = int(await self._db.scalar(count_query) or 0)

        result = await self._db.execute(base_query.offset((page - 1) * size).limit(size))
        stocks = list(result.scalars().all())
        return [self._build_stock_list_item(stock) for stock in stocks], total

    async def get_stock_detail(
        self,
        stock_id: int,
        window_hours: int = 168,
        price_points: int = 30,
        related_articles_limit: int = 10,
    ) -> StockDetailData | None:
        query = (
            select(Stock)
            .where(Stock.id == stock_id, Stock.is_deleted.is_(False))
            .options(
                selectinload(Stock.prices),
                selectinload(Stock.impacts).selectinload(StockImpact.article),
            )
        )
        result = await self._db.execute(query)
        stock = result.scalar_one_or_none()

        if stock is None:
            return None

        from_datetime = datetime.now(timezone.utc) - timedelta(hours=window_hours)
        sorted_prices = sorted(stock.prices, key=lambda item: item.time)
        selected_prices = sorted_prices[-price_points:]
        recent_impacts = [
            impact
            for impact in stock.impacts
            if impact.article is not None
            and impact.article.is_deleted is False
            and impact.article.is_processed is True
            and _ensure_utc_datetime(impact.article.published_at) >= from_datetime
        ]
        recent_impacts.sort(key=lambda item: item.article.published_at, reverse=True)

        return StockDetailData(
            id=stock.id,
            ticker=stock.ticker,
            name=stock.name,
            exchange=stock.exchange,
            sector=stock.sector,
            industry=stock.industry,
            country=stock.country,
            market_cap=float(stock.market_cap) if stock.market_cap is not None else None,
            snapshot=self._build_snapshot(sorted_prices),
            prices=[self._build_price_point(price) for price in selected_prices],
            impact_summary=self._build_impact_summary(recent_impacts),
            related_articles=self._build_related_articles(recent_impacts, related_articles_limit),
        )

    def _build_stock_list_item(self, stock: Stock) -> StockListItem:
        sorted_prices = sorted(stock.prices, key=lambda item: item.time)
        return StockListItem(
            id=stock.id,
            ticker=stock.ticker,
            name=stock.name,
            exchange=stock.exchange,
            sector=stock.sector,
            industry=stock.industry,
            country=stock.country,
            market_cap=float(stock.market_cap) if stock.market_cap is not None else None,
            snapshot=self._build_snapshot(sorted_prices),
        )

    def _build_snapshot(self, prices: list[StockPrice]) -> StockSnapshot:
        if not prices:
            return StockSnapshot()

        latest_price = prices[-1]
        previous_price = prices[-2] if len(prices) > 1 else None
        latest_close = latest_price.close
        previous_close = previous_price.close if previous_price is not None else None

        change: float | None = None
        change_percent: float | None = None
        if latest_close is not None and previous_close not in (None, 0):
            change = float(latest_close - previous_close)
            change_percent = float(change / previous_close * 100)

        return StockSnapshot(
            latest_close=float(latest_close) if latest_close is not None else None,
            previous_close=float(previous_close) if previous_close is not None else None,
            change=change,
            change_percent=change_percent,
            last_updated_at=latest_price.time,
        )

    def _build_price_point(self, price: StockPrice) -> StockPricePoint:
        return StockPricePoint(
            time=price.time,
            open=float(price.open) if price.open is not None else None,
            high=float(price.high) if price.high is not None else None,
            low=float(price.low) if price.low is not None else None,
            close=float(price.close) if price.close is not None else None,
            volume=price.volume,
        )

    def _build_impact_summary(self, impacts: list[StockImpact]) -> StockImpactSummary:
        if not impacts:
            return StockImpactSummary(
                total_signals=0,
                bullish_count=0,
                bearish_count=0,
                neutral_count=0,
                average_impact_score=0.0,
                weighted_impact_score=0.0,
                average_confidence=0.0,
                overall_direction="neutral",
            )

        bullish_count = sum(1 for impact in impacts if impact.direction == "bullish")
        bearish_count = sum(1 for impact in impacts if impact.direction == "bearish")
        neutral_count = sum(1 for impact in impacts if impact.direction == "neutral")
        total_signals = len(impacts)
        impact_score_sum = sum(float(impact.impact_score) for impact in impacts)
        confidence_sum = sum(float(impact.confidence) for impact in impacts)
        weighted_impact_sum = sum(float(impact.impact_score) * float(impact.confidence) for impact in impacts)
        average_impact_score = impact_score_sum / total_signals
        weighted_impact_score = weighted_impact_sum / confidence_sum if confidence_sum > 0 else average_impact_score
        average_confidence = confidence_sum / total_signals

        overall_direction = "neutral"
        if weighted_impact_score >= 0.2:
            overall_direction = "bullish"
        elif weighted_impact_score <= -0.2:
            overall_direction = "bearish"

        return StockImpactSummary(
            total_signals=total_signals,
            bullish_count=bullish_count,
            bearish_count=bearish_count,
            neutral_count=neutral_count,
            average_impact_score=round(average_impact_score, 4),
            weighted_impact_score=round(weighted_impact_score, 4),
            average_confidence=round(average_confidence, 4),
            overall_direction=overall_direction,
        )

    def _build_related_articles(
        self,
        impacts: list[StockImpact],
        related_articles_limit: int,
    ) -> list[StockRelatedArticle]:
        related_articles = [
            StockRelatedArticle(
                article_id=impact.article_id,
                title=impact.article.title if impact.article is not None else "",
                published_at=impact.article.published_at if impact.article is not None else datetime.now(timezone.utc),
                source_name=impact.article.source_name if impact.article is not None else None,
                direction=impact.direction,
                impact_score=float(impact.impact_score),
                confidence=float(impact.confidence),
            )
            for impact in impacts
            if impact.article is not None
        ]
        related_articles.sort(
            key=lambda item: (abs(item.impact_score), item.published_at.timestamp()),
            reverse=True,
        )
        return related_articles[:related_articles_limit]
