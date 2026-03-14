from __future__ import annotations

from sqlalchemy import create_engine, inspect

from app.models import Base, Article, Category, ArticleCategory, Sentiment, Stock, StockPrice, StockImpact, User, Watchlist, Alert


def test_table_names_and_primary_keys() -> None:
    assert Article.__tablename__ == "articles"
    assert Category.__tablename__ == "categories"
    assert ArticleCategory.__tablename__ == "article_categories"
    assert Sentiment.__tablename__ == "sentiments"
    assert Stock.__tablename__ == "stocks"
    assert StockPrice.__tablename__ == "stock_prices"
    assert StockImpact.__tablename__ == "stock_impacts"
    assert User.__tablename__ == "users"
    assert Watchlist.__tablename__ == "watchlists"
    assert Alert.__tablename__ == "alerts"

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    insp = inspect(engine)

    # Primary keys exist
    for table in [
        "articles",
        "categories",
        "sentiments",
        "stocks",
        "stock_prices",
        "stock_impacts",
        "users",
        "watchlists",
        "alerts",
    ]:
        pk = insp.get_pk_constraint(table)
        assert pk["constrained_columns"], f"{table} should have a primary key"


def test_indexes_exist() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    insp = inspect(engine)

    article_indexes = {idx["name"] for idx in insp.get_indexes("articles")}
    assert "idx_articles_published" in article_indexes
    assert "idx_articles_url_hash" in article_indexes
    assert "idx_articles_processed" in article_indexes

    impacts_indexes = {idx["name"] for idx in insp.get_indexes("stock_impacts")}
    assert "idx_impacts_direction" in impacts_indexes

    alerts_indexes = {idx["name"] for idx in insp.get_indexes("alerts")}
    assert "idx_alerts_user" in alerts_indexes
    assert "idx_alerts_active" in alerts_indexes
