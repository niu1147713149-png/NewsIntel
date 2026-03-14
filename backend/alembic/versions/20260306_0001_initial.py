"""initial schema

Revision ID: 20260306_0001
Revises: 
Create Date: 2026-03-06
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260306_0001"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # categories
    op.create_table(
        "categories",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False, unique=True),
        sa.Column("icon", sa.String(length=64), nullable=True),
        sa.Column("parent_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # articles
    op.create_table(
        "articles",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=False, unique=True),
        sa.Column("url_hash", sa.String(length=32), nullable=False),
        sa.Column("source_name", sa.String(length=255), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("author", sa.String(length=255), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("language", sa.String(length=5), nullable=True),
        sa.Column("country", sa.String(length=2), nullable=True),
        sa.Column("is_processed", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_articles_published", "articles", ["published_at"]) 
    op.create_index("idx_articles_url_hash", "articles", ["url_hash"]) 
    op.create_index("idx_articles_processed", "articles", ["is_processed"]) 

    # article_categories
    op.create_table(
        "article_categories",
        sa.Column("article_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("category_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("categories.id"), primary_key=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="ck_article_categories_confidence"),
    )

    # sentiments
    op.create_table(
        "sentiments",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("article_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("label", sa.String(length=10), nullable=False),
        sa.Column("positive", sa.Float(), nullable=False),
        sa.Column("negative", sa.Float(), nullable=False),
        sa.Column("neutral", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("model_version", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("label IN ('positive','negative','neutral')", name="ck_sentiments_label"),
        sa.CheckConstraint(
            "positive >= 0.0 AND positive <= 1.0 AND negative >= 0.0 AND negative <= 1.0 AND neutral >= 0.0 AND neutral <= 1.0",
            name="ck_sentiments_scores_range",
        ),
    )

    # stocks
    op.create_table(
        "stocks",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("ticker", sa.String(length=16), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("exchange", sa.String(length=32), nullable=True),
        sa.Column("sector", sa.String(length=64), nullable=True),
        sa.Column("industry", sa.String(length=64), nullable=True),
        sa.Column("country", sa.String(length=2), nullable=True),
        sa.Column("market_cap", sa.Numeric(20, 2), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # stock_prices
    op.create_table(
        "stock_prices",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("stock_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("stocks.id"), nullable=False),
        sa.Column("time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("open", sa.Float(), nullable=True),
        sa.Column("high", sa.Float(), nullable=True),
        sa.Column("low", sa.Float(), nullable=True),
        sa.Column("close", sa.Float(), nullable=True),
        sa.Column("volume", sa.BigInteger(), nullable=True),
        sa.UniqueConstraint("stock_id", "time", name="uq_stock_prices_stock_time"),
    )
    op.create_index("idx_stock_prices_ticker_time", "stock_prices", ["stock_id", "time"]) 

    # stock_impacts
    op.create_table(
        "stock_impacts",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("article_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stock_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("stocks.id"), nullable=False),
        sa.Column("impact_score", sa.Float(), nullable=False),
        sa.Column("direction", sa.String(length=10), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("factors", sa.JSON(), nullable=True),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("article_id", "stock_id", name="uq_impacts_article_stock"),
    )
    op.create_index("idx_impacts_stock_created", "stock_impacts", ["stock_id", "created_at"]) 
    op.create_index("idx_impacts_direction", "stock_impacts", ["direction"]) 

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=32), nullable=False, server_default=sa.text("'user'")),
        sa.Column("settings", sa.JSON(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"]) 

    # watchlists
    op.create_table(
        "watchlists",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stock_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("stocks.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "stock_id", name="uq_watchlist_user_stock"),
    )
    op.create_index("idx_watchlist_user", "watchlists", ["user_id"]) 

    # alerts
    op.create_table(
        "alerts",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("condition", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_alerts_user", "alerts", ["user_id"]) 
    op.create_index("idx_alerts_active", "alerts", ["is_active"]) 


def downgrade() -> None:
    op.drop_index("idx_alerts_active", table_name="alerts")
    op.drop_index("idx_alerts_user", table_name="alerts")
    op.drop_table("alerts")

    op.drop_index("idx_watchlist_user", table_name="watchlists")
    op.drop_table("watchlists")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.drop_index("idx_impacts_direction", table_name="stock_impacts")
    op.drop_index("idx_impacts_stock_created", table_name="stock_impacts")
    op.drop_table("stock_impacts")

    op.drop_index("idx_stock_prices_ticker_time", table_name="stock_prices")
    op.drop_table("stock_prices")

    op.drop_table("stocks")

    op.drop_table("sentiments")

    op.drop_table("article_categories")

    op.drop_index("idx_articles_processed", table_name="articles")
    op.drop_index("idx_articles_url_hash", table_name="articles")
    op.drop_index("idx_articles_published", table_name="articles")
    op.drop_table("articles")

    op.drop_table("categories")
