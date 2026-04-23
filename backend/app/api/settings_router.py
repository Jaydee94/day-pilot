"""
Settings API – read and persist user-configurable settings.

Endpoints
---------
GET  /api/settings          – return the current effective settings
PUT  /api/settings          – save (partial) settings and apply them live
GET  /api/settings/status   – return setup-wizard completion status
GET  /api/settings/ical-urls            – list configured iCal feed URLs
POST /api/settings/ical-urls            – add an iCal feed URL
DELETE /api/settings/ical-urls/{index} – remove an iCal feed URL
GET  /api/settings/caldav-accounts           – list CalDAV accounts
POST /api/settings/caldav-accounts           – add a CalDAV account
DELETE /api/settings/caldav-accounts/{index} – remove a CalDAV account
"""
import json
import logging
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Iterator, List

import httpx
from fastapi import APIRouter, HTTPException
import pytz

from app.config import settings as app_settings
from app.models.schemas import (
    CalDAVAccount,
    IntegrationTestRequest,
    IntegrationTestResult,
    SetupStatus,
    UserSettings,
)
from app.services.ai_summary import _get_client as _get_ai_client
from app.services.ai_summary import get_ai_config
from app.services.calendar_sync import _get_caldav_client, _get_caldav_configs
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
    "ical_calendar",
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


def _test_ical_calendar_connection() -> IntegrationTestResult:
    """Test iCal feed URLs by attempting to fetch the first configured URL."""
    from app.services.calendar_sync import _get_ical_urls
    import requests as http_requests

    urls = _get_ical_urls()
    if not urls:
        return IntegrationTestResult(
            integration="ical_calendar",
            ok=False,
            message="No iCal URLs configured. Add at least one iCal feed URL.",
        )

    errors: List[str] = []
    for url in urls:
        try:
            resp = http_requests.get(url, timeout=10)
            resp.raise_for_status()
        except Exception as exc:
            errors.append(f"{url}: {exc}")

    if errors:
        return IntegrationTestResult(
            integration="ical_calendar",
            ok=False,
            message="Some iCal feeds could not be reached: " + "; ".join(errors),
        )
    return IntegrationTestResult(
        integration="ical_calendar",
        ok=True,
        message=f"Successfully reached {len(urls)} iCal feed(s).",
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
    if integration == "ical_calendar":
        return _test_ical_calendar_connection()
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


# ---------------------------------------------------------------------------
# iCal feed management (structured: {url, is_birthday})
# ---------------------------------------------------------------------------

def _parse_ical_feeds() -> List[dict]:
    """Return the current iCal feeds as a list of ``{url, is_birthday}`` dicts.

    Reads from ``ICAL_FEEDS`` (JSON array).  When that is empty it falls back
    to ``ICAL_URLS`` (comma-separated), treating all migrated entries as
    ``is_birthday=False``.
    """
    raw_feeds = (app_settings.ICAL_FEEDS or "").strip()
    if raw_feeds:
        try:
            feeds = json.loads(raw_feeds)
            if isinstance(feeds, list):
                return [
                    {"url": f.get("url", ""), "is_birthday": bool(f.get("is_birthday", False))}
                    for f in feeds
                    if f.get("url", "").strip()
                ]
        except Exception:
            pass

    # Migration: convert legacy ICAL_URLS to structured feeds.
    raw_urls = (app_settings.ICAL_URLS or "").strip()
    if raw_urls:
        return [
            {"url": u.strip(), "is_birthday": False}
            for u in raw_urls.split(",")
            if u.strip()
        ]
    return []


def _save_ical_feeds(feeds: List[dict]) -> None:
    """Persist the feed list to ``ICAL_FEEDS`` and clear legacy ``ICAL_URLS``."""
    new_value = json.dumps(feeds, ensure_ascii=False)
    updates: dict = {
        "ICAL_FEEDS": new_value,
        # Clear the legacy comma-separated field so there is no duplication
        # after the first structured save.
        "ICAL_URLS": "",
    }
    save_user_settings(updates)
    app_settings.ICAL_FEEDS = new_value
    app_settings.ICAL_URLS = ""


@settings_router.get(
    "/settings/ical-urls",
    summary="List configured iCal feed URLs",
)
def list_ical_urls() -> List[dict]:
    """Return all configured iCal feeds with their zero-based index and birthday flag."""
    feeds = _parse_ical_feeds()
    return [{"index": i, "url": f["url"], "is_birthday": f["is_birthday"]} for i, f in enumerate(feeds)]


@settings_router.post(
    "/settings/ical-urls",
    summary="Add an iCal feed URL",
)
def add_ical_url(payload: dict) -> dict:
    """Add a new iCal feed URL.

    Expects a JSON body with a ``url`` field and an optional ``is_birthday``
    boolean, e.g.:
    ``{"url": "https://calendar.google.com/calendar/ical/…/basic.ics", "is_birthday": false}``
    """
    url = (payload.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="'url' field is required")
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    is_birthday = bool(payload.get("is_birthday", False))

    feeds = _parse_ical_feeds()
    existing_urls = [f["url"] for f in feeds]
    if url in existing_urls:
        idx = existing_urls.index(url)
        return {"status": "already_exists", "index": idx, "url": url, "is_birthday": feeds[idx]["is_birthday"]}

    feeds.append({"url": url, "is_birthday": is_birthday})
    try:
        _save_ical_feeds(feeds)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to persist settings") from exc
    return {"status": "added", "index": len(feeds) - 1, "url": url, "is_birthday": is_birthday}


@settings_router.patch(
    "/settings/ical-urls/{index}",
    summary="Update an iCal feed (e.g. toggle birthday flag)",
)
def patch_ical_url(index: int, payload: dict) -> dict:
    """Update properties of an existing iCal feed entry by its zero-based index.

    Currently supports updating the ``is_birthday`` flag:
    ``{"is_birthday": true}``
    """
    feeds = _parse_ical_feeds()
    if index < 0 or index >= len(feeds):
        raise HTTPException(status_code=404, detail=f"No iCal feed at index {index}")

    if "is_birthday" in payload:
        feeds[index]["is_birthday"] = bool(payload["is_birthday"])

    try:
        _save_ical_feeds(feeds)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to persist settings") from exc
    return {"status": "updated", "index": index, "url": feeds[index]["url"], "is_birthday": feeds[index]["is_birthday"]}


@settings_router.delete(
    "/settings/ical-urls/{index}",
    summary="Remove an iCal feed URL",
)
def delete_ical_url(index: int) -> dict:
    """Remove an iCal feed entry by its zero-based index."""
    feeds = _parse_ical_feeds()
    if index < 0 or index >= len(feeds):
        raise HTTPException(status_code=404, detail=f"No iCal URL at index {index}")

    removed = feeds.pop(index)
    try:
        _save_ical_feeds(feeds)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to persist settings") from exc
    return {"status": "removed", "url": removed["url"]}


# ---------------------------------------------------------------------------
# CalDAV account management
# ---------------------------------------------------------------------------

def _parse_caldav_accounts() -> List[dict]:
    """Return CalDAV accounts as a list of dicts."""
    raw = (app_settings.CALDAV_CONFIGS or "").strip()
    if raw:
        try:
            accounts = json.loads(raw)
            if isinstance(accounts, list):
                return accounts
        except Exception:
            pass

    # Fall back to legacy single-account variables
    if app_settings.CALDAV_URL:
        return [{
            "url": app_settings.CALDAV_URL,
            "username": app_settings.CALDAV_USERNAME,
            "password": app_settings.CALDAV_PASSWORD,
        }]
    return []


def _save_caldav_accounts(accounts: List[dict]) -> None:
    """Persist CalDAV account list to CALDAV_CONFIGS and clear legacy single-account variables."""
    new_value = json.dumps(accounts, ensure_ascii=False)
    # Always clear legacy single-account variables so they are not picked up
    # alongside the structured CALDAV_CONFIGS (including when the list is empty).
    updates: dict = {
        "CALDAV_CONFIGS": new_value,
        "CALDAV_URL": "",
        "CALDAV_USERNAME": "",
        "CALDAV_PASSWORD": "",
    }
    save_user_settings(updates)
    app_settings.CALDAV_CONFIGS = new_value
    app_settings.CALDAV_URL = ""
    app_settings.CALDAV_USERNAME = ""
    app_settings.CALDAV_PASSWORD = ""


@settings_router.get(
    "/settings/caldav-accounts",
    summary="List configured CalDAV accounts",
)
def list_caldav_accounts() -> List[dict]:
    """Return all configured CalDAV / Apple Calendar accounts (passwords redacted)."""
    accounts = _parse_caldav_accounts()
    return [
        {
            "index": i,
            "url": a.get("url", ""),
            "username": a.get("username", ""),
            "password_set": bool(a.get("password", "")),
        }
        for i, a in enumerate(accounts)
    ]


@settings_router.post(
    "/settings/caldav-accounts",
    summary="Add a CalDAV account",
)
def add_caldav_account(account: CalDAVAccount) -> dict:
    """Add a new CalDAV / Apple Calendar account.

    Note: The password is stored in plaintext in the settings file.  For a
    home-server deployment ensure that the settings file is readable only by
    the application user (e.g. ``chmod 600 settings.json``).
    """
    accounts = _parse_caldav_accounts()
    new_entry = {"url": account.url, "username": account.username or "", "password": account.password or ""}
    accounts.append(new_entry)
    try:
        _save_caldav_accounts(accounts)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to persist settings") from exc
    return {"status": "added", "index": len(accounts) - 1, "url": account.url}


@settings_router.delete(
    "/settings/caldav-accounts/{index}",
    summary="Remove a CalDAV account",
)
def delete_caldav_account(index: int) -> dict:
    """Remove a CalDAV account entry by its zero-based index."""
    accounts = _parse_caldav_accounts()
    if index < 0 or index >= len(accounts):
        raise HTTPException(status_code=404, detail=f"No CalDAV account at index {index}")

    removed = accounts.pop(index)
    try:
        _save_caldav_accounts(accounts)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to persist settings") from exc
    return {"status": "removed", "url": removed.get("url", "")}
