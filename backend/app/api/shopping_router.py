"""
FastAPI router for the shopping list feature.
"""
from fastapi import APIRouter, HTTPException

from app.models.schemas import ShoppingItem, CreateShoppingItemRequest
from app.services.shopping_list import (
    fetch_shopping_items_grouped,
    add_shopping_item,
    check_shopping_item,
    delete_shopping_item,
    clear_checked_items,
)

shopping_router = APIRouter(tags=["shopping"])


@shopping_router.get("/shopping", summary="List all shopping items grouped by category")
def list_shopping_items():
    grouped = fetch_shopping_items_grouped()
    # Convert to serialisable dict
    return {cat: [item.model_dump() for item in items] for cat, items in grouped.items()}


@shopping_router.post("/shopping", summary="Add a shopping item")
def create_shopping_item(payload: CreateShoppingItemRequest) -> ShoppingItem:
    return add_shopping_item(
        name=payload.name,
        category=payload.category,
        quantity=payload.quantity,
    )


@shopping_router.patch("/shopping/{item_id}/check", summary="Toggle checked state")
def check_item(item_id: str):
    if not check_shopping_item(item_id):
        raise HTTPException(status_code=404, detail="Shopping item not found")
    return {"status": "toggled", "item_id": item_id}


@shopping_router.delete("/shopping/{item_id}", summary="Delete a shopping item")
def remove_item(item_id: str):
    if not delete_shopping_item(item_id):
        raise HTTPException(status_code=404, detail="Shopping item not found")
    return {"status": "deleted", "item_id": item_id}


@shopping_router.post("/shopping/clear-checked", summary="Remove all checked items")
def clear_checked():
    removed = clear_checked_items()
    return {"status": "cleared", "removed": removed}
