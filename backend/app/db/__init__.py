"""Database layer for Day Pilot (SQLAlchemy + Alembic).

All persistent application state lives in a relational database. The engine is
configured from the ``DATABASE_URL`` environment variable; it defaults to a
local SQLite file so development and the test-suite work without a running
PostgreSQL server.
"""
from app.db.base import Base
from app.db.engine import engine, SessionLocal, get_session

__all__ = ["Base", "engine", "SessionLocal", "get_session"]
