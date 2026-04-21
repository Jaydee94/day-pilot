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
        from app.services.calendar_sync import fetch_apple_events
        result = fetch_apple_events()
        assert result == []


# ---------------------------------------------------------------------------
# add_apple_event
# ---------------------------------------------------------------------------

class TestAddAppleEvent:
    def test_returns_false_when_not_configured(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.CALDAV_URL", "")
        from app.services.calendar_sync import add_apple_event
        now = datetime.now(BERLIN_TZ)
        result = add_apple_event("Test", now, now)
        assert result is False
