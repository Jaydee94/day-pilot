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
from typing import Any, Dict

logger = logging.getLogger(__name__)

SETTINGS_FILE: str = os.environ.get("SETTINGS_FILE", "/app/data/settings.json")

# Keys that are allowed to be stored / returned through the settings API.
# Infrastructure-level keys (DATABASE_URL, REDIS_URL, POSTGRES_*) are
# intentionally excluded.
USER_CONFIGURABLE_KEYS: tuple[str, ...] = (
    "APP_NAME",
    "APP_TIMEZONE",
    "DAILY_SUMMARY_TIME",
    "AI_PROVIDER",
    "AI_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "GITHUB_TOKEN",
    "OPENWEATHERMAP_API_KEY",
    "WEATHER_CITY",
    "WEATHER_UNITS",
    "CALDAV_URL",
    "CALDAV_USERNAME",
    "CALDAV_PASSWORD",
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
        logger.error("Failed to read settings file %s, falling back to defaults: %s", SETTINGS_FILE, exc)
        return {}


def save_user_settings(updates: Dict[str, Any]) -> None:
    """Merge *updates* into the persisted settings file.

    Only keys listed in :data:`USER_CONFIGURABLE_KEYS` are written.
    """
    allowed = {k: v for k, v in updates.items() if k in USER_CONFIGURABLE_KEYS}
    if not allowed:
        return

    # Read existing data first so we do a merge, not a replace.
    existing = load_user_settings()
    existing.update(allowed)

    os.makedirs(os.path.dirname(os.path.abspath(SETTINGS_FILE)), exist_ok=True)
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as fh:
            json.dump(existing, fh, indent=2, ensure_ascii=False)
        logger.info("Settings saved to %s", SETTINGS_FILE)
    except Exception as exc:
        logger.error("Failed to write settings file %s: %s", SETTINGS_FILE, exc)
        raise


def is_setup_complete() -> bool:
    """Return ``True`` if the user has finished the initial setup wizard."""
    return bool(load_user_settings().get("SETUP_COMPLETE", False))
