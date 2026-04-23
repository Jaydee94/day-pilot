"""
Settings API – read and persist user-configurable settings.

Endpoints
---------
GET  /api/settings          – return the current effective settings
PUT  /api/settings          – save (partial) settings and apply them live
GET  /api/settings/status   – return setup-wizard completion status
POST /api/settings/google-credentials/upload – upload a credentials.json file
GET  /api/settings/google-credentials        – list configured credentials
DELETE /api/settings/google-credentials/{index} – remove a credentials entry
GET  /api/settings/caldav-accounts           – list CalDAV accounts
POST /api/settings/caldav-accounts           – add a CalDAV account
DELETE /api/settings/caldav-accounts/{index} – remove a CalDAV account
"""
import json
import logging
import os
import shutil
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Iterator, List

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
import pytz

from app.config import settings as app_settings
from app.models.schemas import (
    CalDAVAccount,
    GoogleCredentialInfo,
    IntegrationTestRequest,
    IntegrationTestResult,
    SetupStatus,
    UserSettings,
)
from app.services.ai_summary import _get_client as _get_ai_client
from app.services.ai_summary import get_ai_config
from app.services.calendar_sync import _get_caldav_client, _get_google_service, _get_caldav_configs
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


# ---------------------------------------------------------------------------
# Google credentials management
# ---------------------------------------------------------------------------

def _google_credential_paths() -> List[str]:
    """Return the current list of configured Google credential file paths."""
    raw = (app_settings.GOOGLE_CREDENTIALS_JSON or "").strip()
    return [p.strip() for p in raw.split(",") if p.strip()]


@settings_router.post(
    "/settings/google-credentials/upload",
    summary="Upload a Google credentials.json file",
)
async def upload_google_credentials(file: UploadFile = File(...)) -> dict:
    """Upload a Google OAuth2 credentials.json file to the server.

    The file is saved in the configured credentials directory and its path
    is appended to ``GOOGLE_CREDENTIALS_JSON`` (comma-separated for
    multi-account support).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Sanitize filename to prevent path traversal attacks
    safe_filename = os.path.basename(file.filename)
    if not safe_filename or safe_filename in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid filename")

    creds_dir = app_settings.GOOGLE_CREDENTIALS_DIR
    os.makedirs(creds_dir, exist_ok=True)

    dest_path = os.path.join(creds_dir, safe_filename)
    try:
        with open(dest_path, "wb") as fh:
            shutil.copyfileobj(file.file, fh)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {exc}") from exc

    # Append path to GOOGLE_CREDENTIALS_JSON setting
    existing_paths = _google_credential_paths()
    if dest_path not in existing_paths:
        existing_paths.append(dest_path)
    new_value = ",".join(existing_paths)

    try:
        save_user_settings({"GOOGLE_CREDENTIALS_JSON": new_value})
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to persist settings") from exc

    app_settings.GOOGLE_CREDENTIALS_JSON = new_value
    logger.info("Google credentials uploaded: %s", dest_path)
    return {"status": "uploaded", "path": dest_path, "filename": safe_filename}


@settings_router.get(
    "/settings/google-credentials",
    response_model=List[GoogleCredentialInfo],
    summary="List configured Google credentials files",
)
def list_google_credentials() -> List[GoogleCredentialInfo]:
    """Return all configured Google credentials file paths with existence status."""
    paths = _google_credential_paths()
    return [
        GoogleCredentialInfo(
            index=i,
            path=p,
            filename=os.path.basename(p),
            exists=os.path.exists(p),
        )
        for i, p in enumerate(paths)
    ]


@settings_router.delete(
    "/settings/google-credentials/{index}",
    summary="Remove a Google credentials entry",
)
def delete_google_credentials(index: int) -> dict:
    """Remove a Google credentials file entry by its zero-based index.

    The file itself is not deleted from disk – only the path is removed from
    the ``GOOGLE_CREDENTIALS_JSON`` setting.
    """
    paths = _google_credential_paths()
    if index < 0 or index >= len(paths):
        raise HTTPException(status_code=404, detail=f"No credentials entry at index {index}")

    removed = paths.pop(index)
    new_value = ",".join(paths)

    try:
        save_user_settings({"GOOGLE_CREDENTIALS_JSON": new_value})
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to persist settings") from exc

    app_settings.GOOGLE_CREDENTIALS_JSON = new_value
    return {"status": "removed", "path": removed}


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
    """Add a new CalDAV / Apple Calendar account."""
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
