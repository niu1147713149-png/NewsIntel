"""Database bootstrap helpers for startup schema initialization and seed data."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.database import get_async_engine, get_async_session_factory
from app.models import Base
from app.models.article import Article, ArticleCategory, Category, Sentiment
from app.models.stock import Stock, StockImpact, StockPrice
from app.models.user import User

CATEGORY_SEEDS: tuple[tuple[str, str], ...] = (
    ("Geopolitics", "geopolitics"),
    ("Elections", "elections"),
    ("Economy", "economy"),
    ("Crime", "crime"),
    ("Bilateral Agreements", "bilateral_agreements"),
    ("Policy", "policy"),
)

STOCK_SEEDS: tuple[dict[str, str | int], ...] = (
    {
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "exchange": "NASDAQ",
        "sector": "Technology",
        "industry": "Consumer Electronics",
        "country": "US",
        "market_cap": 3250000000000,
    },
    {
        "ticker": "NVDA",
        "name": "NVIDIA Corp.",
        "exchange": "NASDAQ",
        "sector": "Technology",
        "industry": "Semiconductors",
        "country": "US",
        "market_cap": 2900000000000,
    },
)

BASELINE_PRICES: dict[str, float] = {
    "AAPL": 232.0,
    "NVDA": 872.0,
}

SIMULATED_PRICE_DAYS = 5
DEFAULT_USER_EMAIL = "demo@newsintel.local"
DEFAULT_USER_PASSWORD_HASH = "dev-placeholder-no-auth"
DEFAULT_USER_NAME = "Demo User"


async def initialize_database() -> None:
    await _create_tables()
    await _seed_initial_data(get_async_session_factory())


async def _create_tables() -> None:
    engine = get_async_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def _seed_initial_data(session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with session_factory() as session:
        categories_by_slug = await _ensure_categories(session=session)
        seed_article = await _ensure_seed_article(session=session, categories_by_slug=categories_by_slug)
        stocks_by_ticker = await _ensure_seed_stocks(session=session)
        await _ensure_default_user(session=session)
        await _ensure_seed_impacts(session=session, article=seed_article, stocks_by_ticker=stocks_by_ticker)
        await _ensure_recent_stock_prices(session=session, stocks_by_ticker=stocks_by_ticker, trading_days=SIMULATED_PRICE_DAYS)
        await session.commit()


async def _ensure_categories(session: AsyncSession) -> dict[str, Category]:
    slugs = [slug for _, slug in CATEGORY_SEEDS]
    existing_rows = await session.scalars(select(Category).where(Category.slug.in_(slugs)))
    categories_by_slug: dict[str, Category] = {row.slug: row for row in existing_rows}

    for name, slug in CATEGORY_SEEDS:
        if slug in categories_by_slug:
            continue
        category = Category(name=name, slug=slug)
        session.add(category)
        categories_by_slug[slug] = category

    await session.flush()
    return categories_by_slug


async def _ensure_seed_article(session: AsyncSession, categories_by_slug: dict[str, Category]) -> Article:
    seed_url = "https://newsintel.local/seed/fed-policy-path"
    existing_article = await session.scalar(select(Article).where(Article.url == seed_url))
    if existing_article is not None:
        return existing_article

    seed_article = Article(
        title="Fed signals cautious policy path as inflation cools",
        description="Startup seed article for /news endpoint verification.",
        content=(
            "Federal Reserve officials indicated a cautious easing path while monitoring "
            "labor market resilience and inflation expectations."
        ),
        url=seed_url,
        url_hash="seed-fed-policy-path-0001",
        source_name="NewsIntel Seed",
        source_url="https://newsintel.local/seed",
        author="system",
        published_at=datetime.now(timezone.utc),
        language="en",
        country="US",
        is_processed=True,
    )
    seed_article.sentiment = Sentiment(
        label="neutral",
        positive=0.31,
        negative=0.26,
        neutral=0.43,
        confidence=0.43,
        model_version="seed-v1",
    )
    session.add(seed_article)
    await session.flush()

    session.add(
        ArticleCategory(
            article_id=seed_article.id,
            category_id=categories_by_slug["economy"].id,
            confidence=0.82,
        )
    )
    await session.flush()
    return seed_article


async def _ensure_seed_stocks(session: AsyncSession) -> dict[str, Stock]:
    tickers = [str(seed["ticker"]) for seed in STOCK_SEEDS]
    existing_rows = await session.scalars(select(Stock).where(Stock.ticker.in_(tickers)))
    stocks_by_ticker: dict[str, Stock] = {row.ticker: row for row in existing_rows}

    for seed in STOCK_SEEDS:
        ticker = str(seed["ticker"])
        if ticker in stocks_by_ticker:
            continue
        stock = Stock(
            ticker=ticker,
            name=str(seed["name"]),
            exchange=str(seed["exchange"]),
            sector=str(seed["sector"]),
            industry=str(seed["industry"]),
            country=str(seed["country"]),
            market_cap=int(seed["market_cap"]),
        )
        session.add(stock)
        stocks_by_ticker[ticker] = stock

    await session.flush()
    return stocks_by_ticker


async def _ensure_default_user(session: AsyncSession) -> User:
    existing_user = await session.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
    if existing_user is not None:
        return existing_user

    user = User(
        email=DEFAULT_USER_EMAIL,
        password_hash=DEFAULT_USER_PASSWORD_HASH,
        name=DEFAULT_USER_NAME,
        role="user",
        settings=None,
    )
    session.add(user)
    await session.flush()
    return user


async def _ensure_seed_impacts(session: AsyncSession, article: Article, stocks_by_ticker: dict[str, Stock]) -> None:
    existing_impacts = await session.scalars(select(StockImpact).where(StockImpact.article_id == article.id))
    if list(existing_impacts):
        return

    session.add_all(
        [
            StockImpact(
                article_id=article.id,
                stock_id=stocks_by_ticker["AAPL"].id,
                impact_score=0.42,
                direction="bullish",
                confidence=0.74,
                reasoning="Policy path reduces rate pressure for large-cap growth.",
            ),
            StockImpact(
                article_id=article.id,
                stock_id=stocks_by_ticker["NVDA"].id,
                impact_score=0.55,
                direction="bullish",
                confidence=0.78,
                reasoning="Cooling inflation supports AI growth valuation multiples.",
            ),
        ]
    )
    await session.flush()


async def _ensure_recent_stock_prices(
    session: AsyncSession,
    stocks_by_ticker: dict[str, Stock],
    trading_days: int = SIMULATED_PRICE_DAYS,
    anchor_date: date | None = None,
) -> None:
    if not stocks_by_ticker:
        return

    target_days = _get_recent_trading_days(anchor_date=anchor_date, trading_days=trading_days)
    for ticker, stock in stocks_by_ticker.items():
        existing_rows = await session.scalars(select(StockPrice).where(StockPrice.stock_id == stock.id))
        prices = sorted(existing_rows, key=lambda item: item.time)
        existing_dates = {_normalize_to_utc(price.time).date() for price in prices}
        latest_close = float(prices[-1].close) if prices and prices[-1].close is not None else BASELINE_PRICES.get(ticker, 100.0)
        previous_close = latest_close

        for trading_day in target_days:
            if trading_day in existing_dates:
                matched_price = next(
                    (price for price in prices if _normalize_to_utc(price.time).date() == trading_day and price.close is not None),
                    None,
                )
                if matched_price is not None and matched_price.close is not None:
                    previous_close = float(matched_price.close)
                continue

            simulated = _simulate_daily_price(ticker=ticker, trading_day=trading_day, previous_close=previous_close)
            session.add(
                StockPrice(
                    stock_id=stock.id,
                    time=datetime.combine(trading_day, time(hour=20, tzinfo=timezone.utc)),
                    open=simulated["open"],
                    high=simulated["high"],
                    low=simulated["low"],
                    close=simulated["close"],
                    volume=simulated["volume"],
                )
            )
            previous_close = float(simulated["close"])

    await session.flush()


def _simulate_daily_price(ticker: str, trading_day: date, previous_close: float) -> dict[str, float | int]:
    seed_value = sum(ord(char) for char in f"{ticker}-{trading_day.isoformat()}")
    drift = ((seed_value % 9) - 4) * 0.004
    intraday = ((seed_value % 7) + 3) * 0.0035
    open_price = previous_close * (1 + drift / 2)
    close_price = previous_close * (1 + drift)
    high_price = max(open_price, close_price) * (1 + intraday)
    low_price = min(open_price, close_price) * (1 - intraday * 0.85)
    volume = 18000000 + (seed_value % 17) * 2100000

    return {
        "open": _round_price(open_price),
        "high": _round_price(high_price),
        "low": _round_price(low_price),
        "close": _round_price(close_price),
        "volume": volume,
    }


def _get_recent_trading_days(anchor_date: date | None = None, trading_days: int = SIMULATED_PRICE_DAYS) -> list[date]:
    current_date = anchor_date or datetime.now(timezone.utc).date()
    days: list[date] = []
    cursor = current_date
    while len(days) < trading_days:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor -= timedelta(days=1)
    days.reverse()
    return days


def _normalize_to_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _round_price(value: float) -> Decimal:
    return Decimal(f"{value:.2f}")
