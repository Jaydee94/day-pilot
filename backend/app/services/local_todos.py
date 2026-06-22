"""
Local/internal todo service for DayPilot.

Stores locally created tasks in the database so that DayPilot can be used
without any external task provider. Tasks created through the UI are persisted
here when no external provider accepts them.
"""
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from dateutil.relativedelta import relativedelta

import pytz

from app.config import settings
from app.db.engine import get_session
from app.db.models import Todo
from app.models.schemas import TodoItem
from app.services._time import to_aware

logger = logging.getLogger(__name__)


def _local_tz() -> pytz.BaseTzInfo:
    return pytz.timezone(settings.APP_TIMEZONE)


def _to_todo(row: Todo) -> TodoItem:
    """Convert an ORM row to a TodoItem."""
    return TodoItem(
        id=row.id,
        title=row.title,
        due=row.due,
        completed=row.completed,
        priority=row.priority,
        source="local",
        recurrence=row.recurrence,
        assigned_to=row.assigned_to,
    )


def _next_due(current: datetime, recurrence: str) -> datetime:
    if recurrence == "daily":
        return current + timedelta(days=1)
    if recurrence == "weekly":
        return current + timedelta(weeks=1)
    if recurrence == "monthly":
        return current + relativedelta(months=1)
    return current


def fetch_local_todos(assigned_to: Optional[str] = None) -> List[TodoItem]:
    """Return all incomplete local todos.

    When *assigned_to* is provided only todos assigned to that member are returned.
    """
    with get_session() as session:
        query = session.query(Todo).filter(Todo.completed.is_(False))
        if assigned_to:
            query = query.filter(Todo.assigned_to == assigned_to)
        return [_to_todo(row) for row in query.all()]


def add_local_todo(
    title: str,
    due: Optional[datetime] = None,
    recurrence: Optional[str] = None,
    assigned_to: Optional[str] = None,
) -> TodoItem:
    """Create a new local todo and persist it."""
    todo_id = str(uuid.uuid4())
    with get_session() as session:
        session.add(
            Todo(
                id=todo_id,
                title=title,
                due=due,
                completed=False,
                source="local",
                recurrence=recurrence,
                assigned_to=assigned_to,
            )
        )

    return TodoItem(
        id=todo_id,
        title=title,
        due=due,
        completed=False,
        source="local",
        recurrence=recurrence,
        assigned_to=assigned_to,
    )


def complete_local_todo(todo_id: str) -> bool:
    """Mark a local todo as completed.  Returns True if found and updated.

    When the completed todo has a recurrence and a due date the next instance
    is automatically created with the calculated next due date.
    """
    recurrence: Optional[str] = None
    title: Optional[str] = None
    due: Optional[datetime] = None
    with get_session() as session:
        row = session.get(Todo, todo_id)
        if row is None:
            return False
        row.completed = True
        recurrence = row.recurrence
        title = row.title
        due = row.due

    if recurrence and due:
        try:
            # Datetimes round-tripped through SQLite come back naive — re-attach
            # the configured app timezone so the recurrence calculation stays
            # consistent across DST boundaries.
            if due.tzinfo is None:
                due = to_aware(due, _local_tz())
            add_local_todo(
                title=title,
                due=_next_due(due, recurrence),
                recurrence=recurrence,
            )
        except Exception as exc:
            logger.warning("Failed to create next recurrence for %s: %s", todo_id, exc)
    return True


def delete_local_todo(todo_id: str) -> bool:
    """Delete a local todo by ID.  Returns True if the todo was found and removed."""
    with get_session() as session:
        row = session.get(Todo, todo_id)
        if row is None:
            return False
        session.delete(row)
    return True
