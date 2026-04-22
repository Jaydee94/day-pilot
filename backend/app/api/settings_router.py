"""
Settings API – read and persist user-configurable settings.

Endpoints
---------
GET  /api/settings          – return the current effective settings
PUT  /api/settings          – save (partial) settings and apply them live
GET  /api/settings/status   – return setup-wizard completion status
"""
import logging
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Iterator

import httpx
from fastapi import APIRouter, HTTPException
import pytz

from app.config import settings as app_settings
from app.models.schemas import (
    IntegrationTestRequest,
    IntegrationTestResult,
    SetupStatus,
    UserSettings,
)
from app.services.ai_summary import _get_client as _get_ai_client
from app.services.ai_summary import get_ai_config
from app.services.calendar_sync import _get_caldav_client, _get_google_service
from app.services.weather import fetch_weather
from app.services.settings_store import (
    USER_CONFIGURABLE_KEYS,
    is_setup_complete,
    save_user_settings,
)

logger = logging.getLogger(__name__)

settings_router = APIRouter(tags=["settings"])

_TESTABLE_INTEGRATIONS = {
    "ai",
    "google_calendar",
    "apple_calendar",
    "weather",
    "notifications",
    "voice_webhook",
}


def _build_response() -> UserSettings:
    """Build a UserSettings response from the current in-memory settings."""
    return UserSettings(
        **{k: getattr(app_settings, k, None) for k in USER_CONFIGURABLE_KEYS}
    )


@contextmanager
def _temporary_settings_override(overrides: Dict[str, Any]) -> Iterator[None]:
    """Temporarily apply settings overrides for a single integration test."""
    old_values: Dict[str, Any] = {}
    for key, value in overrides.items():
        if hasattr(app_settings, key):
            old_values[key] = getattr(app_settings, key)
            setattr(app_settings, key, value)
    try:
        yield
    finally:
        for key, old_value in old_values.items():
            setattr(app_settings, key, old_value)


def _test_ai_connection() -> IntegrationTestResult:
    cfg = get_ai_config()
    if not cfg.configured:
        return IntegrationTestResult(
            integration="ai",
            ok=False,
            message="AI provider is not configured. Please provide credentials first.",
        )

    try:
        client = _get_ai_client()
        client.models.list()
        return IntegrationTestResult(
            integration="ai",
            ok=True,
            message=f"Connected to AI provider '{cfg.provider}'.",
        )
    except Exception as exc:
        return IntegrationTestResult(
            integration="ai",
            ok=False,
            message=f"AI connection failed: {exc}",
        )


def _test_google_calendar_connection() -> IntegrationTestResult:
    try:
        service, _ = _get_google_service()
        service.calendarList().list(maxResults=1).execute()
        return IntegrationTestResult(
            integration="google_calendar",
            ok=True,
            message="Google Calendar connection is working.",
        )
    except Exception as exc:
        return IntegrationTestResult(
            integration="google_calendar",
            ok=False,
            message=f"Google Calendar connection failed: {exc}",
        )


def _test_apple_calendar_connection() -> IntegrationTestResult:
    try:
        client = _get_caldav_client()
        client.principal().calendars()
        return IntegrationTestResult(
            integration="apple_calendar",
            ok=True,
            message="Apple Calendar (CalDAV) connection is working.",
        )
    except Exception as exc:
        return IntegrationTestResult(
            integration="apple_calendar",
            ok=False,
            message=f"Apple Calendar connection failed: {exc}",
        )


def _test_weather_connection() -> IntegrationTestResult:
    weather = fetch_weather(force_refresh=True)
    if weather:
        return IntegrationTestResult(
            integration="weather",
            ok=True,
            message=f"Weather API connected successfully for {weather.city}.",
        )
    return IntegrationTestResult(
        integration="weather",
        ok=False,
        message="Weather API connection failed. Check API key and city.",
    )


def _test_notifications_connection() -> IntegrationTestResult:
    server = app_settings.NTFY_SERVER.strip()
    topic = app_settings.NTFY_TOPIC.strip()

    if not server:
        return IntegrationTestResult(
            integration="notifications",
            ok=False,
            message="ntfy server URL is missing.",
        )
    if not topic:
        return IntegrationTestResult(
            integration="notifications",
            ok=False,
            message="ntfy topic is missing.",
        )

    url = f"{server.rstrip('/')}/{topic}"
    headers = {}
    if app_settings.NTFY_TOKEN:
        headers["Authorization"] = f"Bearer {app_settings.NTFY_TOKEN}"

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url, headers=headers)
        if resp.status_code < 400:
            return IntegrationTestResult(
                integration="notifications",
                ok=True,
                message="ntfy connection is reachable.",
            )
        return IntegrationTestResult(
            integration="notifications",
            ok=False,
            message=f"ntfy returned HTTP {resp.status_code}.",
        )
    except Exception as exc:
        return IntegrationTestResult(
            integration="notifications",
            ok=False,
            message=f"ntfy connection failed: {exc}",
        )


def _test_voice_webhook_connection() -> IntegrationTestResult:
    secret = app_settings.VOICE_WEBHOOK_SECRET or ""
    if len(secret.strip()) < 8:
        return IntegrationTestResult(
            integration="voice_webhook",
            ok=False,
            message="Voice webhook secret is too short. Use at least 8 characters.",
        )

    tz = pytz.timezone(app_settings.APP_TIMEZONE)
    now = datetime.now(tz)
    return IntegrationTestResult(
        integration="voice_webhook",
        ok=True,
        message=f"Voice webhook is configured. Ready to accept commands at {now.isoformat()}.",
    )


def _run_integration_test(integration: str) -> IntegrationTestResult:
    if integration == "ai":
        return _test_ai_connection()
    if integration == "google_calendar":
        return _test_google_calendar_connection()
    if integration == "apple_calendar":
        return _test_apple_calendar_connection()
    if integration == "weather":
        return _test_weather_connection()
    if integration == "notifications":
        return _test_notifications_connection()
    if integration == "voice_webhook":
        return _test_voice_webhook_connection()

    raise HTTPException(status_code=404, detail=f"Unknown integration '{integration}'")


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


@settings_router.post(
    "/settings/test-connection/{integration}",
    response_model=IntegrationTestResult,
    summary="Test connection for a specific integration",
)
def test_connection(integration: str, payload: IntegrationTestRequest) -> IntegrationTestResult:
    """Run a live connection/configuration test for one integration."""
    if integration not in _TESTABLE_INTEGRATIONS:
        raise HTTPException(status_code=404, detail=f"Unknown integration '{integration}'")

    overrides = {}
    if payload.overrides is not None:
        overrides = {
            k: v
            for k, v in payload.overrides.model_dump().items()
            if v is not None and k in USER_CONFIGURABLE_KEYS
        }

    with _temporary_settings_override(overrides):
        return _run_integration_test(integration)
