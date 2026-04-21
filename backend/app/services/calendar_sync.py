"""
Google Calendar and Apple Calendar (CalDAV) synchronisation service.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

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
# Google Calendar
# ---------------------------------------------------------------------------

def _get_google_service():
    """Build and return an authorised Google Calendar service object."""
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

    creds: Optional[Credentials] = None
    token_path = settings.GOOGLE_TOKEN_JSON

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not settings.GOOGLE_CREDENTIALS_JSON:
                raise RuntimeError("GOOGLE_CREDENTIALS_JSON not configured")
            flow = InstalledAppFlow.from_client_secrets_file(
                settings.GOOGLE_CREDENTIALS_JSON, SCOPES
            )
            creds = flow.run_local_server(port=0)
        os.makedirs(os.path.dirname(token_path), exist_ok=True)
        with open(token_path, "w") as f:
            f.write(creds.to_json())

    return build("calendar", "v3", credentials=creds), creds


def fetch_google_events(date: Optional[datetime] = None) -> List[CalendarEvent]:
    """Fetch today's events from all Google calendars."""
    if not settings.GOOGLE_CREDENTIALS_JSON and not os.path.exists(
        settings.GOOGLE_TOKEN_JSON
    ):
        logger.warning("Google Calendar not configured – skipping")
        return []

    try:
        service, _ = _get_google_service()
        start, end = _today_range()
        if date:
            tz = _local_tz()
            start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=tz)
            end = start + timedelta(days=1)

        cal_list = service.calendarList().list().execute()
        events: List[CalendarEvent] = []

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
        return events
    except Exception as exc:
        logger.error("Failed to fetch Google events: %s", exc)
        return []


def fetch_google_tasks() -> List[TodoItem]:
    """Fetch incomplete tasks from Google Tasks."""
    if not settings.GOOGLE_CREDENTIALS_JSON and not os.path.exists(
        settings.GOOGLE_TOKEN_JSON
    ):
        return []

    try:
        _, creds = _get_google_service()
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
    """Fetch birthdays from Google Contacts for today."""
    if not settings.GOOGLE_CREDENTIALS_JSON and not os.path.exists(
        settings.GOOGLE_TOKEN_JSON
    ):
        return []

    try:
        _, creds = _get_google_service()
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


def add_google_event(
    title: str,
    start: datetime,
    end: datetime,
    location: Optional[str] = None,
) -> Optional[CalendarEvent]:
    """Add an event to the primary Google Calendar."""
    try:
        service, _ = _get_google_service()
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
# Apple / CalDAV Calendar
# ---------------------------------------------------------------------------

def _get_caldav_client():
    try:
        import caldav
    except ImportError as exc:
        raise RuntimeError("caldav not installed") from exc
    if not settings.CALDAV_URL:
        raise RuntimeError("CALDAV_URL not configured")
    client = caldav.DAVClient(
        url=settings.CALDAV_URL,
        username=settings.CALDAV_USERNAME,
        password=settings.CALDAV_PASSWORD,
    )
    return client


def fetch_apple_events(date: Optional[datetime] = None) -> List[CalendarEvent]:
    """Fetch today's events from Apple Calendar via CalDAV."""
    if not settings.CALDAV_URL:
        logger.warning("Apple Calendar (CalDAV) not configured – skipping")
        return []

    try:
        client = _get_caldav_client()
        principal = client.principal()
        start, end = _today_range()
        if date:
            tz = _local_tz()
            start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=tz)
            end = start + timedelta(days=1)

        events: List[CalendarEvent] = []
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

        return events
    except Exception as exc:
        logger.error("Failed to fetch Apple events: %s", exc)
        return []


def add_apple_event(
    title: str,
    start: datetime,
    end: datetime,
    location: Optional[str] = None,
) -> bool:
    """Add an event to the default Apple Calendar via CalDAV."""
    try:
        import vobject

        client = _get_caldav_client()
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
