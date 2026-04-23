"""
iCal (read-only) and Apple Calendar (CalDAV) synchronisation service.

Google Calendar events can be imported as read-only iCal feeds:
  Google Calendar → Settings → Export/integrate calendar → iCal URL

CalDAV is still used for Apple / iCloud calendars and supports both reading
and writing events.
"""
import json
import logging
from datetime import date as date_type
from datetime import datetime, timedelta
from typing import List, Optional

import pytz
import requests as http_requests
from dateutil import parser as dateutil_parser
from icalendar import Calendar as ICalendar
import recurring_ical_events

from app.config import settings
from app.models.schemas import CalendarEvent, TodoItem, Birthday

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sync state
# ---------------------------------------------------------------------------

_last_calendar_sync: Optional[datetime] = None


def get_last_calendar_sync() -> Optional[datetime]:
    """Return the timestamp of the most recent completed calendar sync."""
    return _last_calendar_sync


def sync_calendars() -> None:
    """Fetch all configured calendars and record the sync timestamp.

    This function is called by the background scheduler.  It intentionally
    swallows per-source errors so that a failing iCal feed cannot prevent
    the Apple/CalDAV fetch from running (and vice versa).
    """
    global _last_calendar_sync
    logger.info("Running calendar sync…")
    ical_count = 0
    apple_count = 0
    try:
        ical_events = fetch_ical_events()
        ical_count = len(ical_events)
    except Exception as exc:
        logger.error("Calendar sync: iCal fetch failed: %s", exc)
    try:
        apple_events = fetch_apple_events()
        apple_count = len(apple_events)
    except Exception as exc:
        logger.error("Calendar sync: CalDAV fetch failed: %s", exc)
    _last_calendar_sync = datetime.now(pytz.timezone(settings.APP_TIMEZONE))
    logger.info(
        "Calendar sync completed at %s – iCal: %d event(s), CalDAV: %d event(s)",
        _last_calendar_sync.isoformat(),
        ical_count,
        apple_count,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _local_tz() -> pytz.BaseTzInfo:
    return pytz.timezone(settings.APP_TIMEZONE)


def _today_range():
    tz = _local_tz()
    today = datetime.now(tz).date()
    # Use tz.localize() so that pytz picks the correct DST offset for midnight
    # on the target date, rather than copying today's runtime offset via
    # replace().  The difference matters on DST-transition days.
    start = tz.localize(datetime(today.year, today.month, today.day))
    end = start + timedelta(days=1)
    return start, end


def _to_aware_datetime(dt, tz: pytz.BaseTzInfo) -> datetime:
    """Ensure *dt* (a date or datetime) is a timezone-aware datetime object."""
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return tz.localize(dt)
        return dt
    # Plain date – treat as midnight in local timezone
    return tz.localize(datetime(dt.year, dt.month, dt.day))


# ---------------------------------------------------------------------------
# iCal feed – read-only, multi-URL support
# ---------------------------------------------------------------------------

def _get_ical_urls() -> List[str]:
    """Return the list of configured iCal feed URLs.

    ``ICAL_URLS`` may contain a single URL or a comma-separated list of URLs.
    Blank entries are silently ignored.
    """
    raw = settings.ICAL_URLS or ""
    return [u.strip() for u in raw.split(",") if u.strip()]


def _get_ical_feeds() -> List[dict]:
    """Return structured iCal feed configs as a list of ``{url, is_birthday}`` dicts.

    Reads from ``ICAL_FEEDS`` (JSON array) when available.  Falls back to the
    legacy ``ICAL_URLS`` comma-separated string, treating all migrated entries
    as ``is_birthday=False``.
    """
    import json as _json
    raw_feeds = (settings.ICAL_FEEDS or "").strip()
    if raw_feeds:
        try:
            feeds = _json.loads(raw_feeds)
            if isinstance(feeds, list):
                return [
                    {"url": f.get("url", ""), "is_birthday": bool(f.get("is_birthday", False))}
                    for f in feeds
                    if f.get("url", "").strip()
                ]
        except Exception:
            pass
    # Migrate legacy ICAL_URLS
    return [{"url": u, "is_birthday": False} for u in _get_ical_urls()]


def fetch_ical_events(date: Optional[datetime] = None) -> List[CalendarEvent]:
    """Fetch events from all configured iCal feed URLs for the given date."""
    feeds = _get_ical_feeds()
    if not feeds:
        logger.info(
            "No iCal URLs configured – skipping. "
            "Add a Google/Outlook iCal feed URL in Settings → iCal Calendar."
        )
        return []

    tz = _local_tz()
    start, end = _today_range()
    if date:
        # Use tz.localize() so that pytz picks the correct DST offset for
        # midnight on the requested date.  replace(tzinfo=tz) would always
        # assign the LMT offset instead of the correct local offset.
        local_date = date.astimezone(tz).date() if date.tzinfo is not None else date.date()
        start = tz.localize(datetime(local_date.year, local_date.month, local_date.day))
        end = start + timedelta(days=1)

    events: List[CalendarEvent] = []
    logger.info("Fetching iCal events for %s from %d feed(s)", start.date().isoformat(), len(feeds))
    for feed in feeds:
        url = feed["url"]
        is_birthday_feed = feed.get("is_birthday", False)
        try:
            resp = http_requests.get(url, timeout=15)
            resp.raise_for_status()
            cal = ICalendar.from_ical(resp.content)

            # Extract the calendar name from the X-WR-CALNAME property so that
            # birthday detection can identify birthday-only calendars by name.
            cal_name_raw = cal.get("X-WR-CALNAME")
            cal_name: Optional[str] = str(cal_name_raw) if cal_name_raw else None

            # When the feed is explicitly marked as a birthday feed, override the
            # calendar name with the reserved sentinel so birthday_detection
            # treats every event from this feed as a birthday.
            if is_birthday_feed:
                cal_name = "__birthday__"

            occurrences = recurring_ical_events.of(cal).between(start, end)

            feed_events: List[CalendarEvent] = []
            for component in occurrences:
                raw_start = component.get("DTSTART")
                raw_end = component.get("DTEND")
                raw_duration = component.get("DURATION")

                if raw_start is None:
                    continue
                ev_start = _to_aware_datetime(raw_start.dt, tz)

                if raw_end is not None:
                    ev_end = _to_aware_datetime(raw_end.dt, tz)
                elif raw_duration is not None:
                    ev_end = ev_start + raw_duration.dt
                else:
                    ev_end = ev_start

                uid = str(component.get("UID", ""))
                summary = str(component.get("SUMMARY", "(no title)"))
                loc = component.get("LOCATION")
                desc = component.get("DESCRIPTION")

                feed_events.append(
                    CalendarEvent(
                        id=uid,
                        title=summary,
                        start=ev_start,
                        end=ev_end,
                        location=str(loc) if loc else None,
                        description=str(desc) if desc else None,
                        source="ical",
                        calendar_name=cal_name,
                    )
                )
            logger.info("iCal feed %s returned %d event(s) for %s", url, len(feed_events), start.date().isoformat())
            events.extend(feed_events)
        except Exception as exc:
            logger.error("Failed to fetch iCal events from %s: %s", url, exc)

    return events


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
    raw = (settings.CALDAV_CONFIGS or "").strip()
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
        # Use tz.localize() so that pytz picks the correct DST offset for
        # midnight on the requested date.
        local_date = date.astimezone(tz).date() if date.tzinfo is not None else date.date()
        start = tz.localize(datetime(local_date.year, local_date.month, local_date.day))
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
                    # Extract the CalDAV calendar display name for birthday detection.
                    try:
                        cal_name = str(cal.name) if cal.name else None
                    except Exception:
                        cal_name = None

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
                                calendar_name=cal_name,
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

