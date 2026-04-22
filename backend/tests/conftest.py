"""
Shared pytest fixtures for Day Pilot backend tests.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


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
