"""
Local/internal todo service for DayPilot.

Stores tasks locally in a JSON file so that DayPilot can be used without
any external task provider.  Tasks created through the UI are persisted
here when no external provider accepts them.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from dateutil.relativedelta import relativedelta

import pytz

from app.config import settings
from app.models.schemas import TodoItem

logger = logging.getLogger(__name__)


def _todos_file() -> str:
    return settings.LOCAL_TODOS_FILE


def _local_tz() -> pytz.BaseTzInfo:
    return pytz.timezone(settings.APP_TIMEZONE)


def _load_all_todos() -> List[dict]:
    """Load raw todo dicts from the local todos file."""
    path = _todos_file()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return data
    except Exception as exc:
        logger.error("Failed to read local todos file %s: %s", path, exc)
    return []


def _save_all_todos(todos: List[dict]) -> None:
    """Persist todo dicts to the local todos file."""
    path = _todos_file()
    dir_name = os.path.dirname(os.path.abspath(path))
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(todos, fh, indent=2, ensure_ascii=False)
    except Exception as exc:
        logger.error("Failed to write local todos file %s: %s", path, exc)
        raise


def _dict_to_todo(d: dict) -> Optional[TodoItem]:
    """Convert a stored dict back to a TodoItem.  Returns None on error."""
    try:
        due = None
        if d.get("due"):
            due = datetime.fromisoformat(d["due"])
        return TodoItem(
            id=d["id"],
            title=d["title"],
            due=due,
            completed=d.get("completed", False),
            source="local",
            recurrence=d.get("recurrence"),
        )
    except Exception as exc:
        logger.warning("Skipping malformed local todo %s: %s", d.get("id"), exc)
        return None


def _next_due(current: datetime, recurrence: str) -> datetime:
    if recurrence == "daily":
        return current + timedelta(days=1)
    if recurrence == "weekly":
        return current + timedelta(weeks=1)
    if recurrence == "monthly":
        return current + relativedelta(months=1)
    return current


def fetch_local_todos() -> List[TodoItem]:
    """Return all incomplete local todos."""
    todos: List[TodoItem] = []
    for raw in _load_all_todos():
        todo = _dict_to_todo(raw)
        if todo is None:
            continue
        if not todo.completed:
            todos.append(todo)
    return todos


def add_local_todo(
    title: str,
    due: Optional[datetime] = None,
    recurrence: Optional[str] = None,
) -> TodoItem:
    """Create a new local todo and persist it."""
    todo_id = str(uuid.uuid4())
    raw: dict = {
        "id": todo_id,
        "title": title,
        "completed": False,
        "source": "local",
    }
    if due:
        raw["due"] = due.isoformat()
    if recurrence:
        raw["recurrence"] = recurrence

    all_todos = _load_all_todos()
    all_todos.append(raw)
    _save_all_todos(all_todos)

    return TodoItem(
        id=todo_id,
        title=title,
        due=due,
        completed=False,
        source="local",
        recurrence=recurrence,
    )


def complete_local_todo(todo_id: str) -> bool:
    """Mark a local todo as completed.  Returns True if found and updated.

    When the completed todo has a recurrence and a due date the next instance
    is automatically created with the calculated next due date.
    """
    all_todos = _load_all_todos()
    for raw in all_todos:
        if raw.get("id") == todo_id:
            raw["completed"] = True
            _save_all_todos(all_todos)
            recurrence = raw.get("recurrence")
            if recurrence and raw.get("due"):
                try:
                    due = datetime.fromisoformat(raw["due"])
                    add_local_todo(
                        title=raw["title"],
                        due=_next_due(due, recurrence),
                        recurrence=recurrence,
                    )
                except Exception as exc:
                    logger.warning("Failed to create next recurrence for %s: %s", todo_id, exc)
            return True
    return False


def delete_local_todo(todo_id: str) -> bool:
    """Delete a local todo by ID.  Returns True if the todo was found and removed."""
    all_todos = _load_all_todos()
    original_count = len(all_todos)
    remaining = [t for t in all_todos if t.get("id") != todo_id]
    if len(remaining) == original_count:
        return False
    _save_all_todos(remaining)
    return True
