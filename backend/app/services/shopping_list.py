"""
Shopping list service — stores items in the database, grouped by category.
"""
import logging
import uuid
from typing import Dict, List, Optional

from app.db.engine import get_session
from app.db.models import ShoppingItem as ShoppingItemRow
from app.models.schemas import ShoppingItem

logger = logging.getLogger(__name__)


def _to_item(row: ShoppingItemRow) -> ShoppingItem:
    return ShoppingItem(
        id=row.id,
        name=row.name,
        category=row.category,
        quantity=row.quantity,
        checked=row.checked,
    )


def fetch_shopping_items() -> List[ShoppingItem]:
    """Return all shopping items (checked + unchecked)."""
    with get_session() as session:
        return [_to_item(row) for row in session.query(ShoppingItemRow).all()]


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
    with get_session() as session:
        session.add(
            ShoppingItemRow(
                id=item_id,
                name=name,
                category=category,
                quantity=quantity,
                checked=False,
            )
        )
    return ShoppingItem(id=item_id, name=name, category=category, quantity=quantity, checked=False)


def check_shopping_item(item_id: str) -> bool:
    """Toggle checked state.  Returns True if found."""
    with get_session() as session:
        row = session.get(ShoppingItemRow, item_id)
        if row is None:
            return False
        row.checked = not row.checked
    return True


def delete_shopping_item(item_id: str) -> bool:
    """Delete an item by ID.  Returns True if found."""
    with get_session() as session:
        row = session.get(ShoppingItemRow, item_id)
        if row is None:
            return False
        session.delete(row)
    return True


def clear_checked_items() -> int:
    """Remove all checked items.  Returns number of items removed."""
    with get_session() as session:
        removed = (
            session.query(ShoppingItemRow)
            .filter(ShoppingItemRow.checked.is_(True))
            .delete(synchronize_session=False)
        )
    return removed
