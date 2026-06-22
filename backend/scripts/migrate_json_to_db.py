"""One-time importer: migrate legacy JSON file storage into the database.

Day Pilot used to persist its state as JSON files under ``/app/data``. This
script reads those files (if they exist) and inserts their contents into the
database. It is idempotent: each store is only imported when its target table
is still empty, so running it on every container start is safe.

Run via ``python scripts/migrate_json_to_db.py`` (invoked by entrypoint.sh).
"""
import json
import logging
import os
import sys
from datetime import datetime
from typing import Optional

# Ensure the backend root (which contains the ``app`` package) is importable
# regardless of the working directory the script is launched from.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.db.engine import get_session
from app.db.models import (
    Event,
    FamilyMember,
    NotificationDedup,
    ShoppingItem,
    Todo,
    UserSetting,
)
from app.services.settings_store import USER_CONFIGURABLE_KEYS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrate_json_to_db")


def _read_json(path: str):
    if not path or not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as exc:
        logger.warning("Could not read %s: %s", path, exc)
        return None


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _import_events(session) -> int:
    if session.query(Event).count() > 0:
        return 0
    data = _read_json(settings.LOCAL_EVENTS_FILE)
    if not isinstance(data, list):
        return 0
    count = 0
    for d in data:
        try:
            session.add(
                Event(
                    id=d["id"],
                    title=d["title"],
                    start=_parse_dt(d.get("start")),
                    end=_parse_dt(d.get("end")),
                    location=d.get("location"),
                    description=d.get("description"),
                    source=d.get("source", "local"),
                    assigned_to=d.get("assigned_to"),
                )
            )
            count += 1
        except Exception as exc:
            logger.warning("Skipping malformed event %s: %s", d.get("id"), exc)
    return count


def _import_todos(session) -> int:
    if session.query(Todo).count() > 0:
        return 0
    data = _read_json(settings.LOCAL_TODOS_FILE)
    if not isinstance(data, list):
        return 0
    count = 0
    for d in data:
        try:
            session.add(
                Todo(
                    id=d["id"],
                    title=d["title"],
                    due=_parse_dt(d.get("due")),
                    completed=d.get("completed", False),
                    priority=d.get("priority"),
                    source=d.get("source", "local"),
                    recurrence=d.get("recurrence"),
                    assigned_to=d.get("assigned_to"),
                )
            )
            count += 1
        except Exception as exc:
            logger.warning("Skipping malformed todo %s: %s", d.get("id"), exc)
    return count


def _import_shopping(session) -> int:
    if session.query(ShoppingItem).count() > 0:
        return 0
    data = _read_json(settings.LOCAL_SHOPPING_FILE)
    if not isinstance(data, list):
        return 0
    count = 0
    for d in data:
        try:
            session.add(
                ShoppingItem(
                    id=d["id"],
                    name=d["name"],
                    category=d.get("category", "Sonstiges"),
                    quantity=d.get("quantity"),
                    checked=d.get("checked", False),
                )
            )
            count += 1
        except Exception as exc:
            logger.warning("Skipping malformed shopping item %s: %s", d.get("id"), exc)
    return count


def _import_family(session) -> int:
    if session.query(FamilyMember).count() > 0:
        return 0
    data = _read_json(settings.FAMILY_MEMBERS_FILE)
    if not isinstance(data, list):
        return 0
    count = 0
    for d in data:
        try:
            session.add(
                FamilyMember(
                    id=d["id"],
                    name=d.get("name", ""),
                    age=d.get("age"),
                    notes=d.get("notes", []),
                )
            )
            count += 1
        except Exception as exc:
            logger.warning("Skipping malformed family member %s: %s", d.get("id"), exc)
    return count


def _import_settings(session) -> int:
    if session.query(UserSetting).count() > 0:
        return 0
    path = os.environ.get("SETTINGS_FILE", "/app/data/settings.json")
    data = _read_json(path)
    if not isinstance(data, dict):
        return 0
    count = 0
    for key, value in data.items():
        if key in USER_CONFIGURABLE_KEYS:
            session.add(UserSetting(key=key, value=value))
            count += 1
    return count


def _import_dedup(session) -> int:
    if session.query(NotificationDedup).count() > 0:
        return 0
    data = _read_json(settings.NOTIFICATIONS_DEDUP_FILE)
    if not isinstance(data, dict) or not data.get("date"):
        return 0
    session.add(NotificationDedup(id=1, date=data["date"]))
    return 1


def main() -> None:
    with get_session() as session:
        totals = {
            "events": _import_events(session),
            "todos": _import_todos(session),
            "shopping_items": _import_shopping(session),
            "family_members": _import_family(session),
            "user_settings": _import_settings(session),
            "notification_dedup": _import_dedup(session),
        }
    imported = {k: v for k, v in totals.items() if v}
    if imported:
        logger.info("Imported legacy JSON data: %s", imported)
    else:
        logger.info("No legacy JSON data to import.")


if __name__ == "__main__":
    main()
