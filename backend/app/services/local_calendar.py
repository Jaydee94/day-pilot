"""
Local/internal calendar service for DayPilot.

Stores locally created events in the database so that DayPilot can be used
without any external calendar provider. Events created through the UI are
persisted here when no external calendar accepts them (or when the user
explicitly creates a local event).
"""
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

import pytz

from app.config import settings
from app.db.engine import get_session
from app.db.models import Event
from app.models.schemas import CalendarEvent
from app.services._time import to_aware

logger = logging.getLogger(__name__)


def _local_tz() -> pytz.BaseTzInfo:
    return pytz.timezone(settings.APP_TIMEZONE)


def _to_event(row: Event) -> CalendarEvent:
    """Convert an ORM row to a CalendarEvent."""
    return CalendarEvent(
        id=row.id,
        title=row.title,
        start=row.start,
        end=row.end,
        location=row.location,
        description=row.description,
        source="local",
        assigned_to=row.assigned_to,
    )


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
    with get_session() as session:
        query = session.query(Event)
        if assigned_to:
            query = query.filter(Event.assigned_to == assigned_to)
        for row in query.all():
            ev = _to_event(row)
            ev_start = ev.start
            if ev_start.tzinfo is None:
                ev_start = to_aware(ev_start, tz)
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
    with get_session() as session:
        session.add(
            Event(
                id=event_id,
                title=title,
                start=start,
                end=end,
                location=location,
                description=description,
                source="local",
                assigned_to=assigned_to,
            )
        )

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
    with get_session() as session:
        row = session.get(Event, event_id)
        if row is None:
            return False
        session.delete(row)
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
    with get_session() as session:
        row = session.get(Event, event_id)
        if row is None:
            return None
        if title is not None:
            row.title = title
        if start is not None:
            row.start = start
        if end is not None:
            row.end = end
        if location is not None:
            row.location = location
        if description is not None:
            row.description = description
        if assigned_to is not None:
            row.assigned_to = assigned_to
        session.flush()
        return _to_event(row)
