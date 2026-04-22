import logging

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        # Allow direct attribute assignment so the settings overlay can
        # update values in-place after the object is constructed.
        frozen=False,
    )

    # General
    APP_NAME: str = "Day Pilot"
    APP_TIMEZONE: str = "Europe/Berlin"
    APP_LANGUAGE: Literal["en", "de"] = "en"
    DAILY_SUMMARY_TIME: str = "07:00"  # HH:MM in APP_TIMEZONE

    # Tracks whether the user has completed the interactive setup wizard.
    SETUP_COMPLETE: bool = False

    # AI provider — "openai" (default) or "github" (GitHub Models via GitHub Copilot)
    AI_PROVIDER: Literal["openai", "github", "groq", "google"] = "openai"
    # Model to use; defaults differ per provider (see ai_summary.py)
    AI_MODEL: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"  # kept for backwards compatibility

    # GitHub Models (https://github.com/marketplace/models)
    # Requires a GitHub Personal Access Token with the "models:read" permission.
    GITHUB_TOKEN: str = ""

    # Groq  (https://console.groq.com)  — free tier available
    GROQ_API_KEY: str = ""

    # Google AI Studio  (https://aistudio.google.com)  — free tier available
    GOOGLE_AI_API_KEY: str = ""

    # Weather (WeatherAPI)
    WEATHERAPI_API_KEY: str = ""
    WEATHER_CITY: str = "Berlin"
    WEATHER_UNITS: str = "metric"  # metric | imperial

    # Google Calendar
    GOOGLE_CREDENTIALS_JSON: str = ""  # path to credentials.json
    GOOGLE_TOKEN_JSON: str = "/app/data/google_token.json"

    # Apple / CalDAV Calendar
    CALDAV_URL: str = ""  # e.g. https://caldav.icloud.com
    CALDAV_USERNAME: str = ""
    CALDAV_PASSWORD: str = ""
    # Multiple CalDAV accounts (JSON array of {url, username, password} objects).
    # Takes precedence over the single CALDAV_URL / CALDAV_USERNAME / CALDAV_PASSWORD
    # variables when non-empty. The single-account variables are still supported for
    # backwards compatibility.
    CALDAV_CONFIGS: str = ""

    # Local / internal calendar
    LOCAL_EVENTS_FILE: str = "/app/data/local_events.json"

    # Push Notifications (ntfy.sh)
    NTFY_SERVER: str = "https://ntfy.sh"
    NTFY_TOPIC: str = ""
    NTFY_TOKEN: str = ""

    # Voice Webhook secret (used by Siri Shortcuts / Google Assistant IFTTT)
    VOICE_WEBHOOK_SECRET: str = "change-me-in-production"


def _apply_settings_overlay(s: Settings) -> None:
    """Overlay persisted user settings on top of the env-based defaults.

    This is called once at startup so that values saved through the frontend
    wizard / settings page are picked up without requiring a container restart.
    """
    from app.services.settings_store import load_user_settings  # local import avoids circular dependency

    user = load_user_settings()
    for key, val in user.items():
        if hasattr(s, key):
            try:
                setattr(s, key, val)
            except Exception as exc:  # pragma: no cover
                logger.warning("Could not apply settings overlay for %s, using default value: %s", key, exc)


settings = Settings()
_apply_settings_overlay(settings)
