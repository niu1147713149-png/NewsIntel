from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config


BACKEND_DIR = Path(__file__).resolve().parents[1]


def _alembic_cfg(sqlite_url: str) -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", sqlite_url)
    return cfg


def test_alembic_upgrade_and_downgrade_sqlite(tmp_path: Path) -> None:
    # use file-based SQLite so versions are persisted across connections
    db_path = tmp_path / "test.db"
    url = f"sqlite:///{db_path}"
    cfg = _alembic_cfg(url)

    command.upgrade(cfg, "head")
    # If upgrade succeeds, downgrade back to base
    command.downgrade(cfg, "base")
