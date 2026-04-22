"""
Settings API – read and persist user-configurable settings.

Endpoints
---------
GET  /api/settings          – return the current effective settings
PUT  /api/settings          – save (partial) settings and apply them live
GET  /api/settings/status   – return setup-wizard completion status
"""
import logging

from fastapi import APIRouter, HTTPException

from app.config import settings as app_settings
from app.models.schemas import SetupStatus, UserSettings
from app.services.settings_store import (
    USER_CONFIGURABLE_KEYS,
    is_setup_complete,
    save_user_settings,
)

logger = logging.getLogger(__name__)

settings_router = APIRouter(tags=["settings"])


def _build_response() -> UserSettings:
    """Build a UserSettings response from the current in-memory settings."""
    return UserSettings(
        **{k: getattr(app_settings, k, None) for k in USER_CONFIGURABLE_KEYS}
    )


@settings_router.get(
    "/settings",
    response_model=UserSettings,
    summary="Get current user-configurable settings",
)
def get_settings() -> UserSettings:
    """Return all user-configurable settings with their current effective values."""
    return _build_response()


@settings_router.put(
    "/settings",
    response_model=UserSettings,
    summary="Save user-configurable settings",
)
def update_settings(payload: UserSettings) -> UserSettings:
    """Persist the provided settings and apply them immediately.

    Only non-``None`` fields in the request body are updated; omitted fields
    are left unchanged.  Schedule-related changes (timezone or daily summary
    time) trigger an automatic scheduler restart.
    """
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return _build_response()

    # Persist to disk first so a crash before the in-memory update is safe.
    try:
        save_user_settings(updates)
    except Exception as exc:
        logger.error("Could not persist settings: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save settings") from exc

    # Update in-memory settings so they take effect without a restart.
    scheduler_keys = {"DAILY_SUMMARY_TIME", "APP_TIMEZONE"}
    needs_scheduler_restart = bool(scheduler_keys & set(updates.keys()))

    for key, val in updates.items():
        if hasattr(app_settings, key):
            try:
                setattr(app_settings, key, val)
            except Exception as exc:  # pragma: no cover
                logger.warning(
                    "Setting %s was persisted but failed to apply in-memory (restart may be required): %s",
                    key,
                    exc,
                )

    # Restart the scheduler when timing-related settings change.
    if needs_scheduler_restart:
        try:
            from app.services.scheduler import start_scheduler, stop_scheduler

            stop_scheduler()
            start_scheduler()
            logger.info("Scheduler restarted after settings change.")
        except Exception as exc:  # pragma: no cover
            logger.warning("Scheduler restart failed: %s", exc)

    return _build_response()


@settings_router.get(
    "/settings/status",
    response_model=SetupStatus,
    summary="Setup wizard completion status",
)
def get_setup_status() -> SetupStatus:
    """Return whether the initial setup wizard has been completed."""
    complete = is_setup_complete()
    return SetupStatus(setup_complete=complete, needs_setup=not complete)
