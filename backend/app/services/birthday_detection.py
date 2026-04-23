"""Birthday detection service for DayPilot.

Birthdays are determined exclusively by calendar configuration:
- iCal feeds marked as birthday feeds (``is_birthday=true``) are mapped to the
    internal ``"__birthday__"`` sentinel and always treated as birthday events.
- Calendar names listed in ``BIRTHDAY_CALENDAR_NAMES`` are treated as
    birthday-only calendars (case-insensitive).

No AI or keyword classification is used for birthday detection.
"""
import logging
import re
from datetime import datetime, timedelta
from typing import List, Optional

import pytz

from app.config import settings
from app.models.schemas import Birthday, CalendarEvent

logger = logging.getLogger(__name__)

# Defaults used by dashboard and scheduler prefetch.
DEFAULT_BIRTHDAY_LOOKAHEAD_DAYS = 366
DEFAULT_BIRTHDAY_LIMIT = 5

# Patterns used to strip the keyword from the title to obtain the person's name.
_NAME_STRIP_PATTERNS = [
    # "John's Birthday" / "John's Geburtstag"
    re.compile(r"['']s?\s+(?:birthday|geburtstag|bday)\b", re.IGNORECASE),
    # "Birthday of John" / "Geburtstag von John"
    re.compile(r"^(?:birthday|geburtstag|bday)\s+(?:of|von|:)\s*", re.IGNORECASE),
    # "John Birthday" (keyword at end)
    re.compile(r"\s+(?:birthday|geburtstag|bday|b-day)\s*$", re.IGNORECASE),
    # "Birthday: John" (keyword at start with colon)
    re.compile(r"^(?:birthday|geburtstag|bday)\s*:\s*", re.IGNORECASE),
    # Emoji
    re.compile(r"[🎂]", re.IGNORECASE),
]

# Patterns for extracting ordinal age from titles like "John's 30th Birthday".
_AGE_FROM_TITLE_RE = re.compile(
    r"\b(\d{1,3})(?:st|nd|rd|th)?\s+(?:birthday|geburtstag|bday)\b",
    re.IGNORECASE,
)


def _get_birthday_calendar_names() -> List[str]:
    """Return the normalised list of calendar names configured as birthday-only."""
    raw = settings.BIRTHDAY_CALENDAR_NAMES or ""
    return [name.strip().lower() for name in raw.split(",") if name.strip()]


def _is_birthday_calendar(calendar_name: Optional[str]) -> bool:
    """Return True if *calendar_name* matches one of the configured birthday calendar names.

    Also returns True for the reserved sentinel ``"__birthday__"`` which is
    assigned by the calendar sync service to every event that comes from an
    iCal feed explicitly marked as a birthday feed via the per-feed toggle.

    Comparison is case-insensitive.  When ``BIRTHDAY_CALENDAR_NAMES`` is empty
    or the event carries no calendar name, this returns False.
    """
    if not calendar_name:
        return False
    # The sentinel is set internally by calendar_sync when is_birthday=True on
    # the feed; it always counts as a birthday calendar regardless of the user's
    # BIRTHDAY_CALENDAR_NAMES list.
    if calendar_name == "__birthday__":
        return True
    normalised = calendar_name.strip().lower()
    return normalised in _get_birthday_calendar_names()


def _extract_name(title: str) -> str:
    """Strip birthday keywords/patterns from an event title to get the person's name."""
    name = title
    for pattern in _NAME_STRIP_PATTERNS:
        name = pattern.sub("", name)
    return name.strip(" ,-:") or title.strip()


def _extract_age_from_title(title: str) -> Optional[int]:
    """Try to extract an ordinal age like '30th' from the event title."""
    m = _AGE_FROM_TITLE_RE.search(title)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None


# In-memory cache populated by scheduler-driven sync and used by the dashboard.
_cached_birthdays: List[Birthday] = []
_cache_days_ahead: int = DEFAULT_BIRTHDAY_LOOKAHEAD_DAYS
_cache_limit: int = DEFAULT_BIRTHDAY_LIMIT


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _compute_upcoming_birthdays(days_ahead: int, limit: int) -> List[Birthday]:
    """Compute upcoming birthdays from configured birthday calendars."""
    from app.services.calendar_sync import (  # local import to avoid circular deps
        fetch_apple_events_in_range,
        fetch_ical_events_in_range,
    )

    tz = pytz.timezone(settings.APP_TIMEZONE)
    today = datetime.now(tz)
    start = tz.localize(datetime(today.year, today.month, today.day))
    end = start + timedelta(days=days_ahead + 1)

    birthdays: List[Birthday] = []
    seen_keys: set = set()

    events: List[CalendarEvent] = []
    try:
        events.extend(fetch_ical_events_in_range(start=start, end=end))
    except Exception as exc:
        logger.warning("Could not fetch iCal events for birthday scan: %s", exc)
    try:
        events.extend(fetch_apple_events_in_range(start=start, end=end))
    except Exception as exc:
        logger.warning("Could not fetch Apple events for birthday scan: %s", exc)

    for ev in events:
        if not _is_birthday_calendar(ev.calendar_name):
            continue

        name = _extract_name(ev.title)
        age = _extract_age_from_title(ev.title)
        event_date = ev.start

        # Deduplicate: same person + same date should only appear once.
        dedup_key = (name.lower(), event_date.date())
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        birthdays.append(
            Birthday(name=name, date=event_date, age=age)
        )

    birthdays.sort(key=lambda b: (b.date, b.name))
    return birthdays[:limit]


def refresh_upcoming_birthdays_cache(
    days_ahead: int = DEFAULT_BIRTHDAY_LOOKAHEAD_DAYS,
    limit: int = DEFAULT_BIRTHDAY_LIMIT,
) -> List[Birthday]:
    """Refresh the in-memory upcoming birthdays cache and return the new list."""
    global _cached_birthdays, _cache_days_ahead, _cache_limit
    _cached_birthdays = _compute_upcoming_birthdays(days_ahead=days_ahead, limit=limit)
    _cache_days_ahead = days_ahead
    _cache_limit = limit
    return list(_cached_birthdays)


def get_upcoming_birthdays(
    days_ahead: int = DEFAULT_BIRTHDAY_LOOKAHEAD_DAYS,
    limit: int = DEFAULT_BIRTHDAY_LIMIT,
) -> List[Birthday]:
    """
    Return upcoming birthdays from configured birthday calendars.

    Uses the scheduler-populated in-memory cache when request parameters match
    the cache shape; otherwise computes the result on demand.
    """
    if (
        days_ahead == _cache_days_ahead
        and limit == _cache_limit
        and _cached_birthdays
    ):
        return list(_cached_birthdays)
    return _compute_upcoming_birthdays(days_ahead=days_ahead, limit=limit)


def invalidate_birthday_cache() -> None:
    """Clear the in-memory upcoming birthdays cache."""
    global _cached_birthdays, _cache_days_ahead, _cache_limit
    _cached_birthdays = []
    _cache_days_ahead = DEFAULT_BIRTHDAY_LOOKAHEAD_DAYS
    _cache_limit = DEFAULT_BIRTHDAY_LIMIT
