from typing import List

from fastapi import APIRouter, HTTPException

from app.models.schemas import CreateFamilyMemberRequest, FamilyMemberProfile
from app.services.family_members import (
    add_family_member,
    delete_family_member,
    fetch_family_members,
    update_family_member,
)

family_router = APIRouter(tags=["family"])


@family_router.get("/family-members/profiles", response_model=List[FamilyMemberProfile])
def list_family_profiles():
    return fetch_family_members()


@family_router.post("/family-members/profiles", response_model=FamilyMemberProfile, status_code=201)
def create_family_member(req: CreateFamilyMemberRequest):
    return add_family_member(req.name, req.age, req.notes)


@family_router.put("/family-members/profiles/{member_id}", response_model=FamilyMemberProfile)
def update_family_member_endpoint(member_id: str, req: CreateFamilyMemberRequest):
    member = update_family_member(member_id, req.name, req.age, req.notes)
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
    return member


@family_router.delete("/family-members/profiles/{member_id}")
def delete_family_member_endpoint(member_id: str):
    ok = delete_family_member(member_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Family member not found")
    return {"status": "deleted", "member_id": member_id}
