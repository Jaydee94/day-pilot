"""
Tests for the settings API endpoints.
"""
import json
import os
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path):
    """TestClient with a temporary settings file and no real scheduler."""
    settings_file = str(tmp_path / "settings.json")
    with (
        patch("app.services.settings_store.SETTINGS_FILE", settings_file),
        patch("app.services.scheduler.start_scheduler"),
        patch("app.services.scheduler.stop_scheduler"),
    ):
        from app.main import app

        with TestClient(app) as c:
            yield c, settings_file


class TestGetSettings:
    def test_returns_200(self, client):
        c, _ = client
        resp = c.get("/api/settings")
        assert resp.status_code == 200

    def test_contains_expected_keys(self, client):
        c, _ = client
        data = c.get("/api/settings").json()
        assert "APP_TIMEZONE" in data
        assert "WEATHER_CITY" in data
        assert "SETUP_COMPLETE" in data

    def test_setup_complete_defaults_false(self, client):
        c, _ = client
        data = c.get("/api/settings").json()
        assert data["SETUP_COMPLETE"] is False


class TestUpdateSettings:
    def test_partial_update(self, client):
        c, settings_file = client
        resp = c.put("/api/settings", json={"WEATHER_CITY": "Munich"})
        assert resp.status_code == 200
        assert resp.json()["WEATHER_CITY"] == "Munich"

    def test_persists_to_file(self, client):
        c, settings_file = client
        c.put("/api/settings", json={"WEATHER_CITY": "Hamburg"})
        with open(settings_file) as fh:
            saved = json.load(fh)
        assert saved["WEATHER_CITY"] == "Hamburg"

    def test_mark_setup_complete(self, client):
        c, _ = client
        resp = c.put("/api/settings", json={"SETUP_COMPLETE": True})
        assert resp.status_code == 200
        assert resp.json()["SETUP_COMPLETE"] is True

    def test_empty_payload_is_noop(self, client):
        c, _ = client
        resp = c.put("/api/settings", json={})
        assert resp.status_code == 200

    def test_scheduler_restarts_on_timezone_change(self, client):
        c, _ = client
        with (
            patch("app.services.scheduler.stop_scheduler") as mock_stop,
            patch("app.services.scheduler.start_scheduler") as mock_start,
        ):
            c.put("/api/settings", json={"APP_TIMEZONE": "America/New_York"})
        mock_stop.assert_called_once()
        mock_start.assert_called_once()

    def test_scheduler_restarts_on_time_change(self, client):
        c, _ = client
        with (
            patch("app.services.scheduler.stop_scheduler") as mock_stop,
            patch("app.services.scheduler.start_scheduler") as mock_start,
        ):
            c.put("/api/settings", json={"DAILY_SUMMARY_TIME": "08:30"})
        mock_stop.assert_called_once()
        mock_start.assert_called_once()

    def test_no_scheduler_restart_for_unrelated_change(self, client):
        c, _ = client
        with (
            patch("app.services.scheduler.stop_scheduler") as mock_stop,
            patch("app.services.scheduler.start_scheduler") as mock_start,
        ):
            c.put("/api/settings", json={"WEATHER_CITY": "Berlin"})
        mock_stop.assert_not_called()
        mock_start.assert_not_called()


class TestSetupStatus:
    def test_needs_setup_when_not_complete(self, client):
        c, _ = client
        data = c.get("/api/settings/status").json()
        assert data["setup_complete"] is False
        assert data["needs_setup"] is True

    def test_does_not_need_setup_after_completion(self, client):
        c, _ = client
        c.put("/api/settings", json={"SETUP_COMPLETE": True})
        data = c.get("/api/settings/status").json()
        assert data["setup_complete"] is True
        assert data["needs_setup"] is False


class TestIntegrationConnection:
    def test_weather_connection_success(self, client):
        c, _ = client
        fake_weather = MagicMock(city="Berlin")
        with patch("app.api.settings_router.fetch_weather", return_value=fake_weather):
            resp = c.post(
                "/api/settings/test-connection/weather",
                json={"overrides": {"WEATHER_CITY": "Berlin"}},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["integration"] == "weather"
        assert data["ok"] is True

    def test_notifications_connection_missing_topic(self, client):
        c, _ = client
        resp = c.post(
            "/api/settings/test-connection/notifications",
            json={"overrides": {"NTFY_SERVER": "https://ntfy.sh", "NTFY_TOPIC": ""}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["integration"] == "notifications"
        assert data["ok"] is False

    def test_unknown_integration_returns_404(self, client):
        c, _ = client
        resp = c.post("/api/settings/test-connection/not-real", json={"overrides": {}})
        assert resp.status_code == 404


class TestICalFeedManagement:
    """Tests for iCal feed list endpoints including per-feed birthday toggle."""

    def test_list_empty(self, client):
        c, _ = client
        resp = c.get("/api/settings/ical-urls")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_add_feed_without_birthday_flag(self, client):
        c, _ = client
        resp = c.post("/api/settings/ical-urls", json={"url": "https://example.com/cal.ics"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "added"
        assert data["url"] == "https://example.com/cal.ics"
        assert data["is_birthday"] is False

    def test_add_feed_with_birthday_flag(self, client):
        c, _ = client
        resp = c.post(
            "/api/settings/ical-urls",
            json={"url": "https://example.com/bdays.ics", "is_birthday": True},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "added"
        assert data["is_birthday"] is True

    def test_list_includes_is_birthday(self, client):
        c, _ = client
        c.post("/api/settings/ical-urls", json={"url": "https://example.com/cal.ics"})
        c.post(
            "/api/settings/ical-urls",
            json={"url": "https://example.com/bdays.ics", "is_birthday": True},
        )
        resp = c.get("/api/settings/ical-urls")
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 2
        assert items[0]["is_birthday"] is False
        assert items[1]["is_birthday"] is True

    def test_patch_toggles_birthday_flag(self, client):
        c, _ = client
        c.post("/api/settings/ical-urls", json={"url": "https://example.com/cal.ics"})
        # Toggle on
        resp = c.patch("/api/settings/ical-urls/0", json={"is_birthday": True})
        assert resp.status_code == 200
        assert resp.json()["is_birthday"] is True
        # Verify persisted
        items = c.get("/api/settings/ical-urls").json()
        assert items[0]["is_birthday"] is True

    def test_patch_toggle_off(self, client):
        c, _ = client
        c.post(
            "/api/settings/ical-urls",
            json={"url": "https://example.com/bdays.ics", "is_birthday": True},
        )
        resp = c.patch("/api/settings/ical-urls/0", json={"is_birthday": False})
        assert resp.status_code == 200
        assert resp.json()["is_birthday"] is False

    def test_patch_invalid_index_returns_404(self, client):
        c, _ = client
        resp = c.patch("/api/settings/ical-urls/99", json={"is_birthday": True})
        assert resp.status_code == 404

    def test_delete_feed(self, client):
        c, _ = client
        c.post("/api/settings/ical-urls", json={"url": "https://example.com/cal.ics"})
        resp = c.delete("/api/settings/ical-urls/0")
        assert resp.status_code == 200
        assert resp.json()["status"] == "removed"
        assert c.get("/api/settings/ical-urls").json() == []

    def test_add_missing_url_returns_400(self, client):
        c, _ = client
        resp = c.post("/api/settings/ical-urls", json={"url": ""})
        assert resp.status_code == 400

    def test_add_invalid_url_returns_400(self, client):
        c, _ = client
        resp = c.post("/api/settings/ical-urls", json={"url": "not-a-url"})
        assert resp.status_code == 400
