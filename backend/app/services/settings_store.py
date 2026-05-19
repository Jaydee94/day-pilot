"""
Persistent settings store for Day Pilot.

User-configurable settings are stored as JSON in ``/app/data/settings.json``
(configurable via the ``SETTINGS_FILE`` environment variable).  These values
overlay the environment-variable-based defaults so that operators can still
use ``.env`` for infrastructure secrets while letting end-users tweak
day-to-day configuration through the frontend wizard / settings page.
"""
import json
import logging
import os
import tempfile
from typing import Any, Dict

from app.services._storage import atomic_write_json, file_lock
from app.services._logging import redact

logger = logging.getLogger(__name__)

# Whitelist of allowed root directories for the settings file.  This prevents
# accidental or malicious redirection of the persisted configuration to an
# arbitrary location on disk (e.g. via a tampered SETTINGS_FILE env var).
_SETTINGS_FILE_ALLOWED_ROOTS = (
    os.path.realpath("/app/data"),
    os.path.realpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "data")
    ),
    os.path.realpath(tempfile.gettempdir()),
)


def _validate_settings_path(path: str) -> str:
    """Validate *path* against the whitelist and return its real path.

    Raises ``ValueError`` when the resolved path does not reside under one of
    the allowed root directories.
    """
    resolved = os.path.realpath(path)
    for root in _SETTINGS_FILE_ALLOWED_ROOTS:
        if resolved == root or resolved.startswith(root + os.sep):
            return resolved
    raise ValueError(
        f"SETTINGS_FILE must reside under one of {_SETTINGS_FILE_ALLOWED_ROOTS}, got {resolved}"
    )


SETTINGS_FILE: str = _validate_settings_path(
    os.environ.get("SETTINGS_FILE", "/app/data/settings.json")
)

# Keys that are allowed to be stored / returned through the settings API.
# Infrastructure-level keys (DATABASE_URL, REDIS_URL, POSTGRES_*) are
# intentionally excluded.
USER_CONFIGURABLE_KEYS: tuple[str, ...] = (
    "APP_NAME",
    "APP_TIMEZONE",
    "APP_LANGUAGE",
    "DAILY_SUMMARY_TIME",
    "AI_PROVIDER",
    "AI_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "GITHUB_TOKEN",
    "GROQ_API_KEY",
    "GOOGLE_AI_API_KEY",
    "WEATHERAPI_API_KEY",
    "WEATHER_CITY",
    "WEATHER_UNITS",
    "ICAL_URLS",
    "ICAL_FEEDS",
    "BIRTHDAY_CALENDAR_NAMES",
    "CALDAV_URL",
    "CALDAV_USERNAME",
    "CALDAV_PASSWORD",
    "CALDAV_CONFIGS",
    "NTFY_SERVER",
    "NTFY_TOPIC",
    "NTFY_TOKEN",
    "VOICE_WEBHOOK_SECRET",
    "SETUP_COMPLETE",
)


def load_user_settings() -> Dict[str, Any]:
    """Return the persisted settings from disk.

    If the settings file does not exist yet an empty dict is returned.
    """
    if not os.path.exists(SETTINGS_FILE):
        return {}
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        # Only return keys we know about to guard against stale/unknown keys.
        return {k: v for k, v in data.items() if k in USER_CONFIGURABLE_KEYS}
    except Exception as exc:
        logger.error(
            "Failed to read settings file %s, falling back to defaults: %s",
            SETTINGS_FILE,
            redact(exc),
        )
        return {}


def save_user_settings(updates: Dict[str, Any]) -> None:
    """Merge *updates* into the persisted settings file.

    Only keys listed in :data:`USER_CONFIGURABLE_KEYS` are written.
    """
    allowed = {k: v for k, v in updates.items() if k in USER_CONFIGURABLE_KEYS}
    if not allowed:
        return

    with file_lock(SETTINGS_FILE):
        # Read existing data first so we do a merge, not a replace.
        existing = load_user_settings()
        existing.update(allowed)

        try:
            atomic_write_json(SETTINGS_FILE, existing, mode=0o600)
            logger.info("Settings saved to %s", SETTINGS_FILE)
        except Exception as exc:
            logger.error(
                "Failed to write settings file %s: %s", SETTINGS_FILE, redact(exc)
            )
            raise


def is_setup_complete() -> bool:
    """Return ``True`` if the user has finished the initial setup wizard."""
    return bool(load_user_settings().get("SETUP_COMPLETE", False))
