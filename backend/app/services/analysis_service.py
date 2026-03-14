from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.stock import StockImpact
from app.schemas.analysis import (
    AnalysisOverviewData,
    DirectionShare,
    LatestEventItem,
    MarketAnalysisData,
    MarketPulse,
    OverviewStatsCards,
    SentimentDistributionItem,
    StockRankingItem,
    TopImpactSignalItem,
)
from app.services.news_service import NewsService

Direction = Literal["bullish", "bearish", "neutral"]


@dataclass(slots=True)
class ImpactSignal:
    article: Article
    impact: StockImpact


class MarketAnalysisService:
    def __init__(self, db_session: AsyncSession) -> None:
        self._news_service = NewsService(db_session)

    async def get_market_aggregate(
        self,
        window_hours: int = 24,
        article_limit: int = 200,
        top_stocks: int = 10,
        latest_events: int = 10,
    ) -> MarketAnalysisData:
        current_time = datetime.now(timezone.utc)
        from_datetime = current_time - timedelta(hours=window_hours)
        articles, _ = await self._news_service.search_articles(
            from_datetime=from_datetime,
            to_datetime=current_time,
            page=1,
            size=article_limit,
        )
        signals = self._collect_signals(articles=articles)

        return MarketAnalysisData(
            generated_at=current_time,
            market_pulse=self._build_market_pulse(signals=signals),
            direction_distribution=self._build_direction_distribution(signals=signals),
            stock_rankings=self._build_stock_rankings(signals=signals, top_stocks=top_stocks),
            latest_events=self._build_latest_events(signals=signals, latest_events=latest_events),
        )

    async def get_overview(
        self,
        window_hours: int = 24,
        article_limit: int = 200,
        top_signals: int = 8,
    ) -> AnalysisOverviewData:
        current_time = datetime.now(timezone.utc)
        from_datetime = current_time - timedelta(hours=window_hours)
        articles, _ = await self._news_service.search_articles(
            from_datetime=from_datetime,
            to_datetime=current_time,
            page=1,
            size=article_limit,
        )
        signals = self._collect_signals(articles=articles)
        return AnalysisOverviewData(
            generated_at=current_time,
            stats_cards=self._build_overview_stats_cards(articles=articles, signals=signals),
            sentiment_distribution=self._build_sentiment_distribution(articles=articles),
            top_impact_signals=self._build_top_impact_signals(signals=signals, top_signals=top_signals),
        )

    def _collect_signals(self, articles: list[Article]) -> list[ImpactSignal]:
        signals: list[ImpactSignal] = []
        for article in articles:
            for impact in article.impacts:
                signals.append(ImpactSignal(article=article, impact=impact))
        return signals

    def _build_market_pulse(self, signals: list[ImpactSignal]) -> MarketPulse:
        if not signals:
            return MarketPulse(value=0.0, direction="neutral", sample_size=0)

        weighted_sum = 0.0
        total_weight = 0.0
        for signal in signals:
            confidence = max(0.0, min(1.0, float(signal.impact.confidence)))
            weighted_sum += float(signal.impact.impact_score) * confidence
            total_weight += confidence

        if total_weight <= 0:
            pulse_value = 0.0
        else:
            pulse_value = weighted_sum / total_weight
        pulse_value = max(-1.0, min(1.0, pulse_value))
        return MarketPulse(
            value=round(pulse_value, 4),
            direction=self._pulse_direction(pulse_value=pulse_value),
            sample_size=len(signals),
        )

    def _build_direction_distribution(self, signals: list[ImpactSignal]) -> list[DirectionShare]:
        direction_counts: Counter[Direction] = Counter({"bullish": 0, "bearish": 0, "neutral": 0})
        for signal in signals:
            direction_counts[self._normalize_direction(direction=signal.impact.direction)] += 1

        total = max(1, len(signals))
        return [
            DirectionShare(
                direction=direction,
                count=direction_counts[direction],
                ratio=round(direction_counts[direction] / total, 4),
            )
            for direction in ("bullish", "bearish", "neutral")
        ]

    def _build_stock_rankings(self, signals: list[ImpactSignal], top_stocks: int) -> list[StockRankingItem]:
        grouped_scores: dict[int, list[float]] = defaultdict(list)
        grouped_direction: dict[int, Counter[Direction]] = defaultdict(Counter)
        grouped_ticker: dict[int, str | None] = {}

        for signal in signals:
            stock_id = signal.impact.stock_id
            score = float(signal.impact.impact_score)
            grouped_scores[stock_id].append(score)
            grouped_direction[stock_id][self._normalize_direction(direction=signal.impact.direction)] += 1
            grouped_ticker[stock_id] = signal.impact.stock.ticker if signal.impact.stock else None

        ranking_items: list[StockRankingItem] = []
        for stock_id, scores in grouped_scores.items():
            signal_count = len(scores)
            dominant_direction = self._dominant_direction(direction_counter=grouped_direction[stock_id])
            ranking_items.append(
                StockRankingItem(
                    stock_id=stock_id,
                    ticker=grouped_ticker.get(stock_id),
                    signal_count=signal_count,
                    avg_impact_score=round(sum(scores) / signal_count, 4),
                    max_abs_impact_score=round(max(abs(score) for score in scores), 4),
                    dominant_direction=dominant_direction,
                )
            )

        ranking_items.sort(
            key=lambda item: (item.signal_count, item.max_abs_impact_score, abs(item.avg_impact_score)),
            reverse=True,
        )
        return ranking_items[:top_stocks]

    def _build_latest_events(self, signals: list[ImpactSignal], latest_events: int) -> list[LatestEventItem]:
        sorted_signals = sorted(
            signals,
            key=lambda signal: (
                signal.article.published_at,
                abs(float(signal.impact.impact_score)),
                float(signal.impact.confidence),
            ),
            reverse=True,
        )
        latest_items: list[LatestEventItem] = []
        for signal in sorted_signals[:latest_events]:
            latest_items.append(
                LatestEventItem(
                    article_id=signal.article.id,
                    article_title=signal.article.title,
                    published_at=signal.article.published_at,
                    source_name=signal.article.source_name,
                    stock_id=signal.impact.stock_id,
                    ticker=signal.impact.stock.ticker if signal.impact.stock else None,
                    direction=self._normalize_direction(direction=signal.impact.direction),
                    impact_score=round(float(signal.impact.impact_score), 4),
                    confidence=round(float(signal.impact.confidence), 4),
                )
            )
        return latest_items

    def _build_overview_stats_cards(
        self,
        articles: list[Article],
        signals: list[ImpactSignal],
    ) -> OverviewStatsCards:
        analyzed_sentiment_articles = sum(1 for article in articles if article.sentiment is not None)
        bullish_signals = sum(
            1 for signal in signals if self._normalize_direction(direction=signal.impact.direction) == "bullish"
        )
        bearish_signals = sum(
            1 for signal in signals if self._normalize_direction(direction=signal.impact.direction) == "bearish"
        )
        return OverviewStatsCards(
            total_articles=len(articles),
            analyzed_sentiment_articles=analyzed_sentiment_articles,
            bullish_signals=bullish_signals,
            bearish_signals=bearish_signals,
        )

    def _build_sentiment_distribution(self, articles: list[Article]) -> list[SentimentDistributionItem]:
        counts: Counter[str] = Counter({"positive": 0, "negative": 0, "neutral": 0})
        for article in articles:
            if article.sentiment and article.sentiment.label in counts:
                counts[article.sentiment.label] += 1

        total = counts["positive"] + counts["negative"] + counts["neutral"]
        denominator = total if total > 0 else 1
        return [
            SentimentDistributionItem(
                label=label,
                count=counts[label],
                ratio=round(counts[label] / denominator, 4),
            )
            for label in ("positive", "negative", "neutral")
        ]

    def _build_top_impact_signals(self, signals: list[ImpactSignal], top_signals: int) -> list[TopImpactSignalItem]:
        sorted_signals = sorted(
            signals,
            key=lambda signal: (
                abs(float(signal.impact.impact_score)),
                float(signal.impact.confidence),
                signal.article.published_at,
            ),
            reverse=True,
        )
        top_items: list[TopImpactSignalItem] = []
        for signal in sorted_signals[:top_signals]:
            top_items.append(
                TopImpactSignalItem(
                    article_id=signal.article.id,
                    article_title=signal.article.title,
                    published_at=signal.article.published_at,
                    stock_id=signal.impact.stock_id,
                    ticker=signal.impact.stock.ticker if signal.impact.stock else None,
                    direction=self._normalize_direction(direction=signal.impact.direction),
                    impact_score=round(float(signal.impact.impact_score), 4),
                    confidence=round(float(signal.impact.confidence), 4),
                )
            )
        return top_items

    def _normalize_direction(self, direction: str) -> Direction:
        if direction in {"bullish", "bearish", "neutral"}:
            return direction
        return "neutral"

    def _pulse_direction(self, pulse_value: float) -> Direction:
        if pulse_value >= 0.2:
            return "bullish"
        if pulse_value <= -0.2:
            return "bearish"
        return "neutral"

    def _dominant_direction(self, direction_counter: Counter[Direction]) -> Direction:
        order: tuple[Direction, Direction, Direction] = ("bullish", "bearish", "neutral")
        return max(order, key=lambda direction: direction_counter.get(direction, 0))
