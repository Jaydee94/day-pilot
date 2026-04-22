"""
Tests for the calendar_sync service (unit tests using mocks).
"""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
import pytz

from app.models.schemas import CalendarEvent, TodoItem


BERLIN_TZ = pytz.timezone("Europe/Berlin")


def _make_event(title="Test Event", source="google"):
    now = datetime.now(BERLIN_TZ)
    return CalendarEvent(
        id="evt-1",
        title=title,
        start=now,
        end=now.replace(hour=now.hour + 1),
        source=source,
    )


# ---------------------------------------------------------------------------
# Google Calendar
# ---------------------------------------------------------------------------

class TestFetchGoogleEvents:
    def test_returns_empty_when_not_configured(self, monkeypatch):
        """Should return [] silently when credentials are missing."""
        monkeypatch.setattr("app.services.calendar_sync.settings.GOOGLE_CREDENTIALS_JSON", "")
        monkeypatch.setattr(
            "app.services.calendar_sync.os.path.exists", lambda p: False
        )
        from app.services.calendar_sync import fetch_google_events
        result = fetch_google_events()
        assert result == []

    def test_returns_events_when_service_works(self, monkeypatch):
        """Should parse and return CalendarEvent objects from Google API response."""
        fake_event = {
            "id": "abc123",
            "summary": "Standup",
            "start": {"dateTime": "2024-06-01T09:00:00+02:00"},
            "end": {"dateTime": "2024-06-01T09:30:00+02:00"},
            "location": "Office",
        }
        fake_cal_list = {"items": [{"id": "primary"}]}
        fake_events_result = {"items": [fake_event]}

        mock_service = MagicMock()
        mock_service.calendarList.return_value.list.return_value.execute.return_value = (
            fake_cal_list
        )
        mock_service.events.return_value.list.return_value.execute.return_value = (
            fake_events_result
        )

        with patch(
            "app.services.calendar_sync._get_google_service",
            return_value=(mock_service, MagicMock()),
        ), patch(
            "app.services.calendar_sync.os.path.exists", return_value=True
        ):
            from app.services.calendar_sync import fetch_google_events
            result = fetch_google_events()

        assert len(result) == 1
        assert result[0].title == "Standup"
        assert result[0].location == "Office"
        assert result[0].source == "google"


class TestFetchGoogleTasks:
    def test_returns_empty_when_not_configured(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.GOOGLE_CREDENTIALS_JSON", "")
        monkeypatch.setattr(
            "app.services.calendar_sync.os.path.exists", lambda p: False
        )
        from app.services.calendar_sync import fetch_google_tasks
        result = fetch_google_tasks()
        assert result == []

    def test_returns_tasks(self, monkeypatch):
        fake_task = {"id": "task1", "title": "Buy milk", "status": "needsAction"}
        fake_tasklists = {"items": [{"id": "list1"}]}
        fake_tasks_result = {"items": [fake_task]}

        mock_task_service = MagicMock()
        mock_task_service.tasklists.return_value.list.return_value.execute.return_value = (
            fake_tasklists
        )
        mock_task_service.tasks.return_value.list.return_value.execute.return_value = (
            fake_tasks_result
        )

        with patch(
            "app.services.calendar_sync._get_google_service",
            return_value=(MagicMock(), MagicMock()),
        ), patch(
            "app.services.calendar_sync.os.path.exists", return_value=True
        ), patch(
            "app.services.calendar_sync.gapi_build",
            return_value=mock_task_service,
        ):
            from app.services.calendar_sync import fetch_google_tasks
            result = fetch_google_tasks()

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0].title == "Buy milk"
        assert result[0].source == "google"


# ---------------------------------------------------------------------------
# Apple / CalDAV Calendar
# ---------------------------------------------------------------------------

class TestFetchAppleEvents:
    def test_returns_empty_when_not_configured(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_URL", "")
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_CONFIGS", "")
        from app.services.calendar_sync import fetch_apple_events
        result = fetch_apple_events()
        assert result == []

    def test_returns_empty_when_caldav_configs_empty_array(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_URL", "")
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_CONFIGS", "[]")
        from app.services.calendar_sync import fetch_apple_events
        result = fetch_apple_events()
        assert result == []


# ---------------------------------------------------------------------------
# Multiple CalDAV config parsing
# ---------------------------------------------------------------------------

class TestGetCaldavConfigs:
    def test_returns_single_account_from_legacy_vars(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_URL", "https://caldav.icloud.com")
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_USERNAME", "user@icloud.com")
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_PASSWORD", "pass")
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_CONFIGS", "")
        from app.services.calendar_sync import _get_caldav_configs
        configs = _get_caldav_configs()
        assert len(configs) == 1
        assert configs[0]["url"] == "https://caldav.icloud.com"
        assert configs[0]["username"] == "user@icloud.com"

    def test_parses_multiple_caldav_configs(self, monkeypatch):
        import json
        accounts = [
            {"url": "https://caldav.icloud.com", "username": "a@icloud.com", "password": "pass1"},
            {"url": "https://caldav.icloud.com", "username": "b@icloud.com", "password": "pass2"},
        ]
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_CONFIGS", json.dumps(accounts))
        from app.services.calendar_sync import _get_caldav_configs
        configs = _get_caldav_configs()
        assert len(configs) == 2
        assert configs[0]["username"] == "a@icloud.com"
        assert configs[1]["username"] == "b@icloud.com"

    def test_caldav_configs_overrides_legacy_vars(self, monkeypatch):
        import json
        accounts = [{"url": "https://custom.caldav.example.com", "username": "user", "password": "pw"}]
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_CONFIGS", json.dumps(accounts))
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_URL", "https://caldav.icloud.com")
        from app.services.calendar_sync import _get_caldav_configs
        configs = _get_caldav_configs()
        # CALDAV_CONFIGS takes precedence
        assert len(configs) == 1
        assert configs[0]["url"] == "https://custom.caldav.example.com"

    def test_returns_empty_when_nothing_configured(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_URL", "")
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_CONFIGS", "")
        from app.services.calendar_sync import _get_caldav_configs
        assert _get_caldav_configs() == []


# ---------------------------------------------------------------------------
# Multiple Google accounts
# ---------------------------------------------------------------------------

class TestIterGoogleAccounts:
    def test_returns_empty_when_not_configured(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.GOOGLE_CREDENTIALS_JSON", "")
        monkeypatch.setattr("app.services.calendar_sync.settings.GOOGLE_TOKEN_JSON", "/tmp/nonexistent_token.json")
        from app.services.calendar_sync import _iter_google_accounts
        result = _iter_google_accounts()
        assert result == []

    def test_includes_account_with_existing_token(self, monkeypatch, tmp_path):
        token = tmp_path / "google_token.json"
        token.write_text("{}")
        monkeypatch.setattr("app.services.calendar_sync.settings.GOOGLE_CREDENTIALS_JSON", "")
        monkeypatch.setattr("app.services.calendar_sync.settings.GOOGLE_TOKEN_JSON", str(token))
        from app.services.calendar_sync import _iter_google_accounts
        result = _iter_google_accounts()
        assert len(result) == 1
        assert result[0][1] == str(token)

    def test_parses_comma_separated_credentials(self, monkeypatch, tmp_path):
        creds1 = tmp_path / "creds1.json"
        creds2 = tmp_path / "creds2.json"
        creds1.write_text("{}")
        creds2.write_text("{}")
        token_dir = tmp_path / "tokens"
        token_dir.mkdir()
        token1 = token_dir / "google_token.json"
        token1.write_text("{}")
        monkeypatch.setattr(
            "app.services.calendar_sync.settings.GOOGLE_CREDENTIALS_JSON",
            f"{creds1},{creds2}",
        )
        monkeypatch.setattr("app.services.calendar_sync.settings.GOOGLE_TOKEN_JSON", str(token1))
        from app.services.calendar_sync import _iter_google_accounts
        result = _iter_google_accounts()
        # Both credential files exist, so both accounts should be listed.
        assert len(result) == 2


# ---------------------------------------------------------------------------
# add_apple_event
# ---------------------------------------------------------------------------

class TestAddAppleEvent:
    def test_returns_false_when_not_configured(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_URL", "")
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_CONFIGS", "")
        from app.services.calendar_sync import add_apple_event
        now = datetime.now(BERLIN_TZ)
        result = add_apple_event("Test", now, now)
        assert result is False


# ---------------------------------------------------------------------------
# Local calendar service
# ---------------------------------------------------------------------------

class TestLocalCalendar:
    def test_add_and_fetch_local_event(self, tmp_path, monkeypatch):
        events_file = tmp_path / "local_events.json"
        monkeypatch.setattr("app.services.local_calendar.settings.LOCAL_EVENTS_FILE", str(events_file), raising=False)
        monkeypatch.setattr("app.config.settings.LOCAL_EVENTS_FILE", str(events_file), raising=False)

        from app.services.local_calendar import add_local_event, fetch_local_events

        tz = BERLIN_TZ
        start = datetime.now(tz).replace(hour=10, minute=0, second=0, microsecond=0)
        end = start.replace(hour=11)

        event = add_local_event("Doctor appointment", start, end, location="Clinic")

        assert event.id
        assert event.title == "Doctor appointment"
        assert event.source == "local"
        assert event.location == "Clinic"

        fetched = fetch_local_events(date=start)
        assert any(e.id == event.id for e in fetched)

    def test_delete_local_event(self, tmp_path, monkeypatch):
        events_file = tmp_path / "local_events.json"
        monkeypatch.setattr("app.services.local_calendar.settings.LOCAL_EVENTS_FILE", str(events_file), raising=False)

        from app.services.local_calendar import add_local_event, delete_local_event, fetch_local_events

        tz = BERLIN_TZ
        start = datetime.now(tz).replace(hour=14, minute=0, second=0, microsecond=0)
        end = start.replace(hour=15)

        event = add_local_event("Dentist", start, end)
        assert delete_local_event(event.id) is True
        assert delete_local_event(event.id) is False  # already deleted

        remaining = fetch_local_events(date=start)
        assert not any(e.id == event.id for e in remaining)

    def test_update_local_event(self, tmp_path, monkeypatch):
        events_file = tmp_path / "local_events.json"
        monkeypatch.setattr("app.services.local_calendar.settings.LOCAL_EVENTS_FILE", str(events_file), raising=False)

        from app.services.local_calendar import add_local_event, update_local_event

        tz = BERLIN_TZ
        start = datetime.now(tz).replace(hour=16, minute=0, second=0, microsecond=0)
        end = start.replace(hour=17)

        event = add_local_event("Old title", start, end)
        updated = update_local_event(event.id, title="New title", location="Park")

        assert updated is not None
        assert updated.title == "New title"
        assert updated.location == "Park"

    def test_update_nonexistent_event_returns_none(self, tmp_path, monkeypatch):
        events_file = tmp_path / "local_events.json"
        monkeypatch.setattr("app.services.local_calendar.settings.LOCAL_EVENTS_FILE", str(events_file), raising=False)

        from app.services.local_calendar import update_local_event

        result = update_local_event("does-not-exist", title="Whatever")
        assert result is None

    def test_fetch_local_events_filters_by_day(self, tmp_path, monkeypatch):
        events_file = tmp_path / "local_events.json"
        monkeypatch.setattr("app.services.local_calendar.settings.LOCAL_EVENTS_FILE", str(events_file), raising=False)

        from app.services.local_calendar import add_local_event, fetch_local_events
        from datetime import timedelta

        tz = BERLIN_TZ
        today = datetime.now(tz).replace(hour=9, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)

        ev_today = add_local_event("Today event", today, today.replace(hour=10))
        ev_tomorrow = add_local_event("Tomorrow event", tomorrow, tomorrow.replace(hour=10))

        result = fetch_local_events(date=today)
        ids = [e.id for e in result]
        assert ev_today.id in ids
        assert ev_tomorrow.id not in ids


# ---------------------------------------------------------------------------
# DELETE /api/events/{event_id} route
# ---------------------------------------------------------------------------

class TestDeleteEventRoute:
    def test_delete_local_event_success(self, client):
        with patch("app.api.routes.delete_local_event", return_value=True):
            resp = client.delete("/api/events/local-123")
        assert resp.status_code == 200
        assert resp.json()["event_id"] == "local-123"

    def test_delete_nonexistent_event_returns_404(self, client):
        with patch("app.api.routes.delete_local_event", return_value=False):
            resp = client.delete("/api/events/no-such-event")
        assert resp.status_code == 404
