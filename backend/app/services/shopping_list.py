"""
Shopping list service — stores items locally in a JSON file, grouped by category.
"""
import json
import logging
import os
import uuid
from typing import Dict, List, Optional

from app.config import settings
from app.models.schemas import ShoppingItem
from app.services._storage import atomic_write_json, file_lock

logger = logging.getLogger(__name__)


def _shopping_file() -> str:
    return settings.LOCAL_SHOPPING_FILE


def _load_all_items() -> List[dict]:
    path = _shopping_file()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            return data
    except Exception as exc:
        logger.error("Failed to read shopping file %s: %s", path, exc)
    return []


def _save_all_items(items: List[dict]) -> None:
    path = _shopping_file()
    try:
        atomic_write_json(path, items)
    except Exception as exc:
        logger.error("Failed to write shopping file %s: %s", path, exc)
        raise


def _dict_to_item(d: dict) -> Optional[ShoppingItem]:
    try:
        return ShoppingItem(
            id=d["id"],
            name=d["name"],
            category=d.get("category", "Sonstiges"),
            quantity=d.get("quantity"),
            checked=d.get("checked", False),
        )
    except Exception as exc:
        logger.warning("Skipping malformed shopping item %s: %s", d.get("id"), exc)
        return None


def fetch_shopping_items() -> List[ShoppingItem]:
    """Return all shopping items (checked + unchecked)."""
    items: List[ShoppingItem] = []
    for raw in _load_all_items():
        item = _dict_to_item(raw)
        if item is not None:
            items.append(item)
    return items


def fetch_shopping_items_grouped() -> Dict[str, List[ShoppingItem]]:
    """Return items grouped by category, unchecked first within each group."""
    grouped: Dict[str, List[ShoppingItem]] = {}
    for item in fetch_shopping_items():
        grouped.setdefault(item.category, []).append(item)
    # Sort: unchecked before checked within each category
    for cat in grouped:
        grouped[cat].sort(key=lambda x: x.checked)
    return grouped


def add_shopping_item(
    name: str,
    category: str = "Sonstiges",
    quantity: Optional[str] = None,
) -> ShoppingItem:
    item_id = str(uuid.uuid4())
    raw: dict = {
        "id": item_id,
        "name": name,
        "category": category,
        "checked": False,
    }
    if quantity:
        raw["quantity"] = quantity
    with file_lock(_shopping_file()):
        all_items = _load_all_items()
        all_items.append(raw)
        _save_all_items(all_items)
    return ShoppingItem(id=item_id, name=name, category=category, quantity=quantity, checked=False)


def check_shopping_item(item_id: str) -> bool:
    """Toggle checked state.  Returns True if found."""
    all_items = _load_all_items()
    for raw in all_items:
        if raw.get("id") == item_id:
            raw["checked"] = not raw.get("checked", False)
            _save_all_items(all_items)
            return True
    return False


def delete_shopping_item(item_id: str) -> bool:
    """Delete an item by ID.  Returns True if found."""
    all_items = _load_all_items()
    remaining = [i for i in all_items if i.get("id") != item_id]
    if len(remaining) == len(all_items):
        return False
    _save_all_items(remaining)
    return True


def clear_checked_items() -> int:
    """Remove all checked items.  Returns number of items removed."""
    all_items = _load_all_items()
    remaining = [i for i in all_items if not i.get("checked", False)]
    removed = len(all_items) - len(remaining)
    if removed:
        _save_all_items(remaining)
    return removed
