"""Tests for the shopping list service and API routes.

Isolation between tests is provided by the autouse ``reset_database`` fixture
in conftest.py, which truncates every table before each test.
"""


class TestShoppingService:
    def test_add_and_fetch_item(self):
        from app.services.shopping_list import add_shopping_item, fetch_shopping_items
        item = add_shopping_item("Milk", "Dairy", "1L")
        assert item.name == "Milk"
        assert item.category == "Dairy"
        assert item.quantity == "1L"
        assert not item.checked

        items = fetch_shopping_items()
        assert any(i.name == "Milk" for i in items)

    def test_check_toggles_state(self):
        from app.services.shopping_list import add_shopping_item, check_shopping_item, fetch_shopping_items
        item = add_shopping_item("Eggs")
        assert check_shopping_item(item.id) is True
        items = fetch_shopping_items()
        assert items[0].checked is True
        # Toggle back
        check_shopping_item(item.id)
        items = fetch_shopping_items()
        assert items[0].checked is False

    def test_check_returns_false_for_unknown_id(self):
        from app.services.shopping_list import check_shopping_item
        assert check_shopping_item("nonexistent") is False

    def test_delete_item(self):
        from app.services.shopping_list import add_shopping_item, delete_shopping_item, fetch_shopping_items
        item = add_shopping_item("Bread")
        assert delete_shopping_item(item.id) is True
        assert fetch_shopping_items() == []

    def test_delete_returns_false_for_unknown_id(self):
        from app.services.shopping_list import delete_shopping_item
        assert delete_shopping_item("unknown") is False

    def test_clear_checked_removes_only_checked(self):
        from app.services.shopping_list import (
            add_shopping_item, check_shopping_item,
            clear_checked_items, fetch_shopping_items,
        )
        a = add_shopping_item("Apples")
        add_shopping_item("Bananas")
        check_shopping_item(a.id)
        removed = clear_checked_items()
        assert removed == 1
        remaining = fetch_shopping_items()
        assert len(remaining) == 1
        assert remaining[0].name == "Bananas"

    def test_fetch_grouped_returns_categories(self):
        from app.services.shopping_list import add_shopping_item, fetch_shopping_items_grouped
        add_shopping_item("Milk", "Dairy")
        add_shopping_item("Apples", "Produce")
        grouped = fetch_shopping_items_grouped()
        assert "Dairy" in grouped
        assert "Produce" in grouped


class TestShoppingRoutes:
    def test_list_empty(self, client):
        resp = client.get("/api/shopping")
        assert resp.status_code == 200
        assert resp.json() == {}

    def test_create_and_list(self, client):
        resp = client.post("/api/shopping", json={"name": "Milk", "category": "Dairy", "quantity": "1L"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Milk"
        assert data["category"] == "Dairy"

        list_resp = client.get("/api/shopping")
        assert "Dairy" in list_resp.json()

    def test_check_item(self, client):
        create_resp = client.post("/api/shopping", json={"name": "Bread"})
        item_id = create_resp.json()["id"]
        check_resp = client.patch(f"/api/shopping/{item_id}/check")
        assert check_resp.status_code == 200
        assert check_resp.json()["status"] == "toggled"

    def test_check_not_found(self, client):
        resp = client.patch("/api/shopping/nonexistent/check")
        assert resp.status_code == 404

    def test_delete_item(self, client):
        create_resp = client.post("/api/shopping", json={"name": "Eggs"})
        item_id = create_resp.json()["id"]
        del_resp = client.delete(f"/api/shopping/{item_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"

    def test_delete_not_found(self, client):
        resp = client.delete("/api/shopping/nonexistent")
        assert resp.status_code == 404

    def test_clear_checked(self, client):
        create_resp = client.post("/api/shopping", json={"name": "Milk"})
        item_id = create_resp.json()["id"]
        client.patch(f"/api/shopping/{item_id}/check")
        clear_resp = client.post("/api/shopping/clear-checked")
        assert clear_resp.status_code == 200
        assert clear_resp.json()["removed"] == 1
