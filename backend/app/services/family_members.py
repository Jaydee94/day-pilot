import json
import uuid
from pathlib import Path
from typing import List, Optional

from app.config import settings
from app.models.schemas import FamilyMemberProfile


def _load() -> List[dict]:
    path = Path(settings.FAMILY_MEMBERS_FILE)
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save(members: List[dict]) -> None:
    path = Path(settings.FAMILY_MEMBERS_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(members, ensure_ascii=False, indent=2), encoding="utf-8")


def _to_profile(d: dict) -> FamilyMemberProfile:
    return FamilyMemberProfile(
        id=d.get("id", str(uuid.uuid4())),
        name=d.get("name", ""),
        age=d.get("age"),
        notes=d.get("notes", []),
    )


def fetch_family_members() -> List[FamilyMemberProfile]:
    return [_to_profile(d) for d in _load()]


def fetch_family_member_names() -> List[str]:
    """Return only the names — used for event/todo assignment dropdowns."""
    members = fetch_family_members()
    if members:
        return [m.name for m in members]
    # Fallback to legacy comma-separated FAMILY_MEMBERS setting
    raw = settings.FAMILY_MEMBERS or ""
    return [n.strip() for n in raw.split(",") if n.strip()]


def add_family_member(
    name: str,
    age: Optional[int] = None,
    notes: Optional[List[str]] = None,
) -> FamilyMemberProfile:
    members = _load()
    new = {"id": str(uuid.uuid4()), "name": name, "age": age, "notes": notes or []}
    members.append(new)
    _save(members)
    return _to_profile(new)


def update_family_member(
    member_id: str,
    name: str,
    age: Optional[int],
    notes: List[str],
) -> Optional[FamilyMemberProfile]:
    members = _load()
    for m in members:
        if m.get("id") == member_id:
            m["name"] = name
            m["age"] = age
            m["notes"] = notes
            _save(members)
            return _to_profile(m)
    return None


def delete_family_member(member_id: str) -> bool:
    members = _load()
    new_list = [m for m in members if m.get("id") != member_id]
    if len(new_list) == len(members):
        return False
    _save(new_list)
    return True
