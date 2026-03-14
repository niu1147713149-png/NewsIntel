from __future__ import annotations

from logging.config import fileConfig
import os

from sqlalchemy import engine_from_config, pool
from alembic import context

# Import Base metadata
from app.models import Base  # noqa: F401

# Alembic Config object, provides access to ini values.
config = context.config

# Allow DATABASE_URL override via env var
if url := os.getenv("DATABASE_URL"):  # pragma: no cover
    config.set_main_option("sqlalchemy.url", url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:  # pragma: no cover
    fileConfig(config.config_file_name)

# target_metadata for 'autogenerate' support
from app.models import Base as TargetBase  # noqa: E402

target_metadata = TargetBase.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
