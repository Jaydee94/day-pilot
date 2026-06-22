"""
Persistent settings store for Day Pilot.

User-configurable settings are stored in the ``user_settings`` table as
key/value rows. These values overlay the environment-variable-based defaults so
that operators can still use ``.env`` for infrastructure secrets while letting
end-users tweak day-to-day configuration through the frontend wizard / settings
page.
"""
import logging
from typing import Any, Dict

from app.db.engine import get_session
from app.db.models import UserSetting
from app.services._logging import redact

logger = logging.getLogger(__name__)

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
    """Return the persisted user settings.

    Only keys present in :data:`USER_CONFIGURABLE_KEYS` are returned. Any
    database error (e.g. the table does not exist yet during first-boot before
    migrations run) is swallowed and an empty dict is returned so the config
    bootstrap never crashes.
    """
    try:
        with get_session() as session:
            rows = session.query(UserSetting).all()
            return {row.key: row.value for row in rows if row.key in USER_CONFIGURABLE_KEYS}
    except Exception as exc:
        logger.warning("Could not load user settings from database, using defaults: %s", redact(exc))
        return {}


def save_user_settings(updates: Dict[str, Any]) -> None:
    """Merge *updates* into the persisted settings (UPSERT per key).

    Only keys listed in :data:`USER_CONFIGURABLE_KEYS` are written.
    """
    allowed = {k: v for k, v in updates.items() if k in USER_CONFIGURABLE_KEYS}
    if not allowed:
        return
    try:
        with get_session() as session:
            for key, value in allowed.items():
                row = session.get(UserSetting, key)
                if row is None:
                    session.add(UserSetting(key=key, value=value))
                else:
                    row.value = value
        logger.info("Saved %d user setting(s) to database", len(allowed))
    except Exception as exc:
        logger.error("Failed to save user settings to database: %s", redact(exc))
        raise


def is_setup_complete() -> bool:
    """Return ``True`` if the user has finished the initial setup wizard."""
    return bool(load_user_settings().get("SETUP_COMPLETE", False))
