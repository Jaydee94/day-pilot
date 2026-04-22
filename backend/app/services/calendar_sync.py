"""
Google Calendar and Apple Calendar (CalDAV) synchronisation service.
"""
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import pytz
from dateutil import parser as dateutil_parser

try:
    from googleapiclient.discovery import build as gapi_build
except ImportError:  # pragma: no cover
    gapi_build = None  # type: ignore[assignment]

from app.config import settings
from app.models.schemas import CalendarEvent, TodoItem, Birthday

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _local_tz() -> pytz.BaseTzInfo:
    return pytz.timezone(settings.APP_TIMEZONE)


def _today_range():
    tz = _local_tz()
    now = datetime.now(tz)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end


# ---------------------------------------------------------------------------
# Google Calendar – multi-account support
# ---------------------------------------------------------------------------

def _google_credential_paths() -> List[str]:
    """Return a list of credentials.json paths from GOOGLE_CREDENTIALS_JSON.

    The setting may contain a single path or a comma-separated list of paths
    (for multiple Google accounts).  Blank entries are silently ignored.
    """
    raw = settings.GOOGLE_CREDENTIALS_JSON or ""
    return [p.strip() for p in raw.split(",") if p.strip()]


def _token_path_for_credentials(creds_path: str) -> str:
    """Derive the token JSON path that corresponds to a credentials file.

    The first account always uses GOOGLE_TOKEN_JSON.  Additional accounts get
    token files in the same directory with a numeric suffix so they do not
    overwrite each other.
    """
    all_paths = _google_credential_paths()
    if all_paths and creds_path == all_paths[0]:
        return settings.GOOGLE_TOKEN_JSON
    # Derive a unique token file name based on the credentials file stem.
    base_dir = os.path.dirname(settings.GOOGLE_TOKEN_JSON)
    stem = os.path.splitext(os.path.basename(creds_path))[0]
    return os.path.join(base_dir, f"google_token_{stem}.json")


def _get_google_service(credentials_json: Optional[str] = None, token_json: Optional[str] = None):
    """Build and return an authorised Google Calendar service object.

    Parameters
    ----------
    credentials_json:
        Path to the OAuth2 ``credentials.json`` file.  Defaults to
        ``settings.GOOGLE_CREDENTIALS_JSON`` (first entry if comma-separated).
    token_json:
        Path to the OAuth2 token cache.  Defaults to ``settings.GOOGLE_TOKEN_JSON``.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise RuntimeError("google-api-python-client not installed") from exc

    SCOPES = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/tasks.readonly",
        "https://www.googleapis.com/auth/contacts.readonly",
    ]

    if credentials_json is None:
        paths = _google_credential_paths()
        credentials_json = paths[0] if paths else ""
    if token_json is None:
        token_json = _token_path_for_credentials(credentials_json) if credentials_json else settings.GOOGLE_TOKEN_JSON

    creds: Optional[Credentials] = None

    if os.path.exists(token_json):
        creds = Credentials.from_authorized_user_file(token_json, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not credentials_json:
                raise RuntimeError("GOOGLE_CREDENTIALS_JSON not configured")
            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_json, SCOPES
            )
            creds = flow.run_local_server(port=0)
        os.makedirs(os.path.dirname(os.path.abspath(token_json)), exist_ok=True)
        with open(token_json, "w") as f:
            f.write(creds.to_json())

    return build("calendar", "v3", credentials=creds), creds


def _iter_google_accounts() -> List[Tuple[str, str]]:
    """Return (credentials_json, token_json) pairs for all configured Google accounts.

    An account is considered configured when either:
    - ``credentials_json`` file exists on disk, or
    - the corresponding ``token_json`` already exists (token refreshed on a
      previous run).

    Returns an empty list when no Google accounts are configured.
    """
    pairs: List[Tuple[str, str]] = []
    cred_paths = _google_credential_paths()
    if not cred_paths:
        # No credential paths configured at all.
        token = settings.GOOGLE_TOKEN_JSON
        if os.path.exists(token):
            pairs.append(("", token))
        return pairs

    for creds_path in cred_paths:
        token = _token_path_for_credentials(creds_path)
        if os.path.exists(creds_path) or os.path.exists(token):
            pairs.append((creds_path, token))
    return pairs


def fetch_google_events(date: Optional[datetime] = None) -> List[CalendarEvent]:
    """Fetch today's events from all configured Google Calendar accounts."""
    accounts = _iter_google_accounts()
    if not accounts:
        logger.warning("Google Calendar not configured – skipping")
        return []

    start, end = _today_range()
    if date:
        tz = _local_tz()
        start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=tz)
        end = start + timedelta(days=1)

    events: List[CalendarEvent] = []
    for creds_path, token_path in accounts:
        try:
            service, _ = _get_google_service(credentials_json=creds_path, token_json=token_path)
            cal_list = service.calendarList().list().execute()

            for cal in cal_list.get("items", []):
                result = (
                    service.events()
                    .list(
                        calendarId=cal["id"],
                        timeMin=start.isoformat(),
                        timeMax=end.isoformat(),
                        singleEvents=True,
                        orderBy="startTime",
                    )
                    .execute()
                )
                for item in result.get("items", []):
                    raw_start = item["start"].get("dateTime", item["start"].get("date"))
                    raw_end = item["end"].get("dateTime", item["end"].get("date"))
                    events.append(
                        CalendarEvent(
                            id=item["id"],
                            title=item.get("summary", "(no title)"),
                            start=dateutil_parser.parse(raw_start),
                            end=dateutil_parser.parse(raw_end),
                            location=item.get("location"),
                            description=item.get("description"),
                            source="google",
                        )
                    )
        except Exception as exc:
            logger.error("Failed to fetch Google events for account %s: %s", creds_path or "token-only", exc)

    return events


def fetch_google_tasks() -> List[TodoItem]:
    """Fetch incomplete tasks from Google Tasks (first configured account)."""
    accounts = _iter_google_accounts()
    if not accounts:
        return []

    creds_path, token_path = accounts[0]
    try:
        _, creds = _get_google_service(credentials_json=creds_path, token_json=token_path)
        service = gapi_build("tasks", "v1", credentials=creds)
        task_lists = service.tasklists().list().execute()
        todos: List[TodoItem] = []

        for tl in task_lists.get("items", []):
            result = service.tasks().list(
                tasklist=tl["id"], showCompleted=False
            ).execute()
            for item in result.get("items", []):
                due = None
                if item.get("due"):
                    due = dateutil_parser.parse(item["due"])
                todos.append(
                    TodoItem(
                        id=item["id"],
                        title=item.get("title", "(no title)"),
                        due=due,
                        completed=item.get("status") == "completed",
                        source="google",
                    )
                )
        return todos
    except Exception as exc:
        logger.error("Failed to fetch Google Tasks: %s", exc)
        return []


def fetch_google_birthdays() -> List[Birthday]:
    """Fetch birthdays from Google Contacts for today (first configured account)."""
    accounts = _iter_google_accounts()
    if not accounts:
        return []

    creds_path, token_path = accounts[0]
    try:
        _, creds = _get_google_service(credentials_json=creds_path, token_json=token_path)
        service = gapi_build("people", "v1", credentials=creds)
        tz = _local_tz()
        today = datetime.now(tz)
        birthdays: List[Birthday] = []

        connections = (
            service.people()
            .connections()
            .list(
                resourceName="people/me",
                personFields="names,birthdays",
                pageSize=1000,
            )
            .execute()
        )

        for person in connections.get("connections", []):
            for bday in person.get("birthdays", []):
                date_data = bday.get("date", {})
                month = date_data.get("month")
                day = date_data.get("day")
                year = date_data.get("year")
                if month == today.month and day == today.day:
                    name = ""
                    if person.get("names"):
                        name = person["names"][0].get("displayName", "")
                    age = today.year - year if year else None
                    bday_dt = datetime(
                        year or today.year, month, day, tzinfo=tz
                    )
                    birthdays.append(Birthday(name=name, date=bday_dt, age=age))

        return birthdays
    except Exception as exc:
        logger.error("Failed to fetch Google birthdays: %s", exc)
        return []


def add_google_task(
    title: str,
    due: Optional[datetime] = None,
) -> Optional[TodoItem]:
    """Add a task to the default Google Tasks list (first configured account)."""
    accounts = _iter_google_accounts()
    if not accounts:
        logger.error("No Google accounts configured; cannot add task")
        return None
    creds_path, token_path = accounts[0]
    try:
        _, creds = _get_google_service(credentials_json=creds_path, token_json=token_path)
        service = gapi_build("tasks", "v1", credentials=creds)
        task_lists = service.tasklists().list().execute()
        items = task_lists.get("items", [])
        if not items:
            logger.error("No Google Task lists found")
            return None
        default_list_id = items[0]["id"]

        body: dict = {"title": title}
        if due:
            # Google Tasks API requires RFC 3339 timestamp
            body["due"] = due.isoformat()

        created = service.tasks().insert(tasklist=default_list_id, body=body).execute()
        return TodoItem(
            id=created["id"],
            title=created.get("title", title),
            due=due,
            completed=False,
            source="google",
        )
    except Exception as exc:
        logger.error("Failed to add Google task: %s", exc)
        return None


def add_google_event(
    title: str,
    start: datetime,
    end: datetime,
    location: Optional[str] = None,
) -> Optional[CalendarEvent]:
    """Add an event to the primary Google Calendar (first configured account)."""
    accounts = _iter_google_accounts()
    if not accounts:
        logger.warning("No Google accounts configured; cannot add event")
        return None
    creds_path, token_path = accounts[0]
    try:
        service, _ = _get_google_service(credentials_json=creds_path, token_json=token_path)
        body = {
            "summary": title,
            "start": {"dateTime": start.isoformat(), "timeZone": settings.APP_TIMEZONE},
            "end": {"dateTime": end.isoformat(), "timeZone": settings.APP_TIMEZONE},
        }
        if location:
            body["location"] = location
        created = service.events().insert(calendarId="primary", body=body).execute()
        return CalendarEvent(
            id=created["id"],
            title=created.get("summary", title),
            start=start,
            end=end,
            location=location,
            source="google",
        )
    except Exception as exc:
        logger.error("Failed to add Google event: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Apple / CalDAV Calendar – multi-account support
# ---------------------------------------------------------------------------

def _get_caldav_configs() -> List[dict]:
    """Return a list of CalDAV account configs.

    When ``CALDAV_CONFIGS`` is set it must be a JSON array of objects with
    keys ``url``, ``username``, and ``password``.  When it is empty the
    legacy single-account variables ``CALDAV_URL`` / ``CALDAV_USERNAME`` /
    ``CALDAV_PASSWORD`` are used as a single-element list (backwards compat).
    """
    raw = settings.CALDAV_CONFIGS.strip()
    if raw:
        try:
            configs = json.loads(raw)
            if isinstance(configs, list):
                return [c for c in configs if c.get("url")]
        except Exception as exc:
            logger.error("Failed to parse CALDAV_CONFIGS: %s", exc)

    # Fall back to single-account legacy variables.
    if settings.CALDAV_URL:
        return [{
            "url": settings.CALDAV_URL,
            "username": settings.CALDAV_USERNAME,
            "password": settings.CALDAV_PASSWORD,
        }]
    return []


def _get_caldav_client(url: Optional[str] = None, username: Optional[str] = None, password: Optional[str] = None):
    """Return a configured CalDAV client.

    When called without arguments the first configured CalDAV account is used.
    """
    try:
        import caldav
    except ImportError as exc:
        raise RuntimeError("caldav not installed") from exc

    if url is None:
        configs = _get_caldav_configs()
        if not configs:
            raise RuntimeError("No CalDAV accounts configured (CALDAV_URL or CALDAV_CONFIGS is empty)")
        cfg = configs[0]
        url = cfg["url"]
        username = cfg.get("username", "")
        password = cfg.get("password", "")

    client = caldav.DAVClient(url=url, username=username, password=password)
    return client


def fetch_apple_events(date: Optional[datetime] = None) -> List[CalendarEvent]:
    """Fetch today's events from all configured CalDAV (Apple/iCloud) accounts."""
    configs = _get_caldav_configs()
    if not configs:
        logger.warning("Apple Calendar (CalDAV) not configured – skipping")
        return []

    start, end = _today_range()
    if date:
        tz = _local_tz()
        start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=tz)
        end = start + timedelta(days=1)

    events: List[CalendarEvent] = []
    for cfg in configs:
        try:
            client = _get_caldav_client(
                url=cfg["url"],
                username=cfg.get("username", ""),
                password=cfg.get("password", ""),
            )
            principal = client.principal()

            for cal in principal.calendars():
                try:
                    raw_events = cal.date_search(start=start, end=end, expand=True)
                    for ev in raw_events:
                        vevent = ev.vobject_instance.vevent
                        ev_start = vevent.dtstart.value
                        ev_end = getattr(vevent, "dtend", None)
                        if ev_end:
                            ev_end = ev_end.value
                        else:
                            duration = getattr(vevent, "duration", None)
                            ev_end = (
                                ev_start + duration.value if duration else ev_start
                            )

                        # normalise to timezone-aware
                        if not hasattr(ev_start, "tzinfo") or ev_start.tzinfo is None:
                            ev_start = _local_tz().localize(
                                datetime(
                                    ev_start.year,
                                    ev_start.month,
                                    ev_start.day,
                                )
                            )
                        if not hasattr(ev_end, "tzinfo") or ev_end.tzinfo is None:
                            ev_end = _local_tz().localize(
                                datetime(
                                    ev_end.year,
                                    ev_end.month,
                                    ev_end.day,
                                )
                            )

                        events.append(
                            CalendarEvent(
                                id=str(vevent.uid.value),
                                title=str(vevent.summary.value),
                                start=ev_start,
                                end=ev_end,
                                location=str(vevent.location.value)
                                if hasattr(vevent, "location")
                                else None,
                                description=str(vevent.description.value)
                                if hasattr(vevent, "description")
                                else None,
                                source="apple",
                            )
                        )
                except Exception as cal_exc:
                    logger.warning("Error reading CalDAV calendar %s: %s", cal, cal_exc)

        except Exception as exc:
            logger.error("Failed to fetch Apple events for a CalDAV account: %s", exc)

    return events


def add_apple_event(
    title: str,
    start: datetime,
    end: datetime,
    location: Optional[str] = None,
) -> bool:
    """Add an event to the first configured Apple Calendar via CalDAV."""
    configs = _get_caldav_configs()
    if not configs:
        logger.warning("No CalDAV accounts configured; cannot add event")
        return False
    try:
        import vobject

        cfg = configs[0]
        client = _get_caldav_client(
            url=cfg["url"],
            username=cfg.get("username", ""),
            password=cfg.get("password", ""),
        )
        principal = client.principal()
        calendars = principal.calendars()
        if not calendars:
            return False
        cal = calendars[0]

        vcal = vobject.iCalendar()
        vevent = vcal.add("vevent")
        vevent.add("summary").value = title
        vevent.add("dtstart").value = start
        vevent.add("dtend").value = end
        if location:
            vevent.add("location").value = location

        cal.add_event(vcal.serialize())
        return True
    except Exception as exc:
        logger.error("Failed to add Apple event: %s", exc)
        return False

