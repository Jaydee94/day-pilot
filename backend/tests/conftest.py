"""
Shared pytest fixtures for Day Pilot backend tests.
"""
import os
import tempfile

# Ensure the voice webhook router is mounted during tests.  The app conditionally
# mounts /api/voice/* only when VOICE_WEBHOOK_SECRET is non-empty (security
# hardening — see backend/app/main.py).  Tests patch the secret on the imported
# module after the app has been built, so we need a non-empty value at the time
# settings are first read.
os.environ.setdefault("VOICE_WEBHOOK_SECRET", "test-secret")

# Point the database engine at a throwaway on-disk SQLite file for the whole
# test session.  This MUST happen before any ``app`` module is imported, because
# app/db/engine.py builds the engine from DATABASE_URL at import time.
_DB_FD, _DB_PATH = tempfile.mkstemp(suffix="-daypilot-test.db")
os.close(_DB_FD)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH}"

from unittest.mock import patch  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db import models  # noqa: E402,F401  (registers tables on Base.metadata)
from app.db.engine import engine  # noqa: E402

# Create the schema once for the session.
Base.metadata.create_all(engine)


def pytest_sessionfinish(session, exitstatus):
    """Remove the temporary SQLite file when the test session ends."""
    try:
        os.unlink(_DB_PATH)
    except OSError:
        pass


@pytest.fixture(autouse=True)
def reset_database():
    """Truncate every table before each test so cases stay isolated."""
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    yield


@pytest.fixture()
def client():
    """Return a FastAPI TestClient with the scheduler patched out."""
    with patch("app.services.scheduler.start_scheduler"), patch(
        "app.services.scheduler.stop_scheduler"
    ):
        from app.main import app

        with TestClient(app) as c:
            yield c


@pytest.fixture(autouse=True)
def reset_app_settings():
    """Reset any mutable in-memory settings to their defaults between tests.

    The ``PUT /api/settings`` endpoint mutates the global ``app_settings``
    object in-place so that changes take effect without a restart.  This
    fixture captures the state before each test and restores it afterwards,
    preventing state leakage between tests.
    """
    from app.config import settings as app_settings
    from app.services.settings_store import USER_CONFIGURABLE_KEYS

    # Snapshot the current values of every user-configurable key.
    snapshot = {k: getattr(app_settings, k) for k in USER_CONFIGURABLE_KEYS if hasattr(app_settings, k)}
    yield
    # Restore the snapshot after the test completes.
    for key, val in snapshot.items():
        try:
            setattr(app_settings, key, val)
        except Exception:
            pass
