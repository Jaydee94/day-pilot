"""Family member profile store (database-backed)."""
import uuid
from typing import List, Optional

from app.config import settings
from app.db.engine import get_session
from app.db.models import FamilyMember
from app.models.schemas import FamilyMemberProfile


def _to_profile(row: FamilyMember) -> FamilyMemberProfile:
    return FamilyMemberProfile(
        id=row.id,
        name=row.name,
        age=row.age,
        notes=list(row.notes or []),
    )


def fetch_family_members() -> List[FamilyMemberProfile]:
    with get_session() as session:
        return [_to_profile(row) for row in session.query(FamilyMember).all()]


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
    member_id = str(uuid.uuid4())
    with get_session() as session:
        session.add(
            FamilyMember(id=member_id, name=name, age=age, notes=notes or [])
        )
    return FamilyMemberProfile(id=member_id, name=name, age=age, notes=notes or [])


def update_family_member(
    member_id: str,
    name: str,
    age: Optional[int],
    notes: List[str],
) -> Optional[FamilyMemberProfile]:
    with get_session() as session:
        row = session.get(FamilyMember, member_id)
        if row is None:
            return None
        row.name = name
        row.age = age
        row.notes = notes
        session.flush()
        return _to_profile(row)


def delete_family_member(member_id: str) -> bool:
    with get_session() as session:
        row = session.get(FamilyMember, member_id)
        if row is None:
            return False
        session.delete(row)
    return True
