"""
Local/internal calendar service for DayPilot.

Stores events locally in a JSON file so that DayPilot can be used without
any external calendar provider.  Events created through the UI are persisted
here when no external calendar accepts them (or when the user explicitly
creates a local event).
"""
import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

import pytz

from app.config import settings
from app.models.schemas import CalendarEvent
from app.services._storage import atomic_write_json, file_lock

logger = logging.getLogger(__name__)


def _events_file() -> str:
    return settings.LOCAL_EVENTS_FILE


def _local_tz() -> pytz.BaseTzInfo:
    return pytz.timezone(settings.APP_TIMEZONE)


def _load_all_events() -> List[dict]:
    """Load raw event dicts from the local events file."""
    path = _events_file()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return data
    except Exception as exc:
        logger.error("Failed to read local events file %s: %s", path, exc)
    return []


def _save_all_events(events: List[dict]) -> None:
    """Persist event dicts to the local events file."""
    path = _events_file()
    try:
        atomic_write_json(path, events)
    except Exception as exc:
        logger.error("Failed to write local events file %s: %s", path, exc)
        raise


def _dict_to_event(d: dict) -> Optional[CalendarEvent]:
    """Convert a stored dict back to a CalendarEvent.  Returns None on error."""
    try:
        return CalendarEvent(
            id=d["id"],
            title=d["title"],
            start=datetime.fromisoformat(d["start"]),
            end=datetime.fromisoformat(d["end"]),
            location=d.get("location"),
            description=d.get("description"),
            source="local",
            assigned_to=d.get("assigned_to"),
        )
    except Exception as exc:
        logger.warning("Skipping malformed local event %s: %s", d.get("id"), exc)
        return None


def fetch_local_events(
    date: Optional[datetime] = None,
    assigned_to: Optional[str] = None,
) -> List[CalendarEvent]:
    """Return local events for the given day (defaults to today).

    When *assigned_to* is provided only events assigned to that member are returned.
    """
    tz = _local_tz()
    if date:
        start = date.astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        now = datetime.now(tz)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    events: List[CalendarEvent] = []
    for raw in _load_all_events():
        ev = _dict_to_event(raw)
        if ev is None:
            continue
        if assigned_to and ev.assigned_to != assigned_to:
            continue
        ev_start = ev.start
        if ev_start.tzinfo is None:
            ev_start = tz.localize(ev_start)
        else:
            ev_start = ev_start.astimezone(tz)
        if start <= ev_start < end:
            events.append(ev)

    return sorted(events, key=lambda e: e.start)


def add_local_event(
    title: str,
    start: datetime,
    end: datetime,
    location: Optional[str] = None,
    description: Optional[str] = None,
    assigned_to: Optional[str] = None,
) -> CalendarEvent:
    """Create a new local event and persist it."""
    event_id = str(uuid.uuid4())
    raw = {
        "id": event_id,
        "title": title,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "source": "local",
    }
    if location:
        raw["location"] = location
    if description:
        raw["description"] = description
    if assigned_to:
        raw["assigned_to"] = assigned_to

    with file_lock(_events_file()):
        all_events = _load_all_events()
        all_events.append(raw)
        _save_all_events(all_events)

    return CalendarEvent(
        id=event_id,
        title=title,
        start=start,
        end=end,
        location=location,
        description=description,
        source="local",
        assigned_to=assigned_to,
    )


def delete_local_event(event_id: str) -> bool:
    """Delete a local event by ID.  Returns True if the event was found and removed."""
    with file_lock(_events_file()):
        all_events = _load_all_events()
        original_count = len(all_events)
        remaining = [e for e in all_events if e.get("id") != event_id]
        if len(remaining) == original_count:
            return False
        _save_all_events(remaining)
    return True


def update_local_event(
    event_id: str,
    title: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    location: Optional[str] = None,
    description: Optional[str] = None,
    assigned_to: Optional[str] = None,
) -> Optional[CalendarEvent]:
    """Update an existing local event.  Returns the updated event or None if not found."""
    with file_lock(_events_file()):
        all_events = _load_all_events()
        for raw in all_events:
            if raw.get("id") == event_id:
                if title is not None:
                    raw["title"] = title
                if start is not None:
                    raw["start"] = start.isoformat()
                if end is not None:
                    raw["end"] = end.isoformat()
                if location is not None:
                    raw["location"] = location
                if description is not None:
                    raw["description"] = description
                if assigned_to is not None:
                    raw["assigned_to"] = assigned_to
                _save_all_events(all_events)
                return _dict_to_event(raw)
    return None
