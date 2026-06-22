"""SQLAlchemy engine and session factory.

The database URL is read straight from the environment (``DATABASE_URL``) rather
than from ``app.config`` so that this module has no dependency on the settings
object — settings_store bootstraps the config overlay from the database, so the
engine must be importable before the config overlay runs.
"""
import os
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Default to a local SQLite file so dev environments and the test-suite work
# without a running PostgreSQL server. Production sets DATABASE_URL to a
# postgresql+psycopg://… URL via docker-compose / Helm.
DEFAULT_DATABASE_URL = "sqlite:///./day_pilot.db"


def _database_url() -> str:
    return os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL


def _make_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        # Allow the connection to be shared across threads (APScheduler runs the
        # daily pipeline on a background thread).
        connect_args["check_same_thread"] = False
    return create_engine(url, future=True, pool_pre_ping=True, connect_args=connect_args)


engine = _make_engine(_database_url())
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


@contextmanager
def get_session() -> Iterator[Session]:
    """Yield a session, committing on success and rolling back on error."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def reconfigure(url: str | None = None) -> None:
    """Rebuild the engine/session factory against *url* (or the current env).

    Used by the test-suite to point the engine at a temporary database.
    """
    global engine, SessionLocal
    engine.dispose()
    engine = _make_engine(url or _database_url())
    SessionLocal.configure(bind=engine)
