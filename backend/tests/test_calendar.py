"""
Tests for the calendar_sync service (unit tests using mocks).
"""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
import pytz

from app.models.schemas import CalendarEvent, TodoItem


BERLIN_TZ = pytz.timezone("Europe/Berlin")


def _make_event(title="Test Event", source="ical"):
    now = datetime.now(BERLIN_TZ)
    return CalendarEvent(
        id="evt-1",
        title=title,
        start=now,
        end=now.replace(hour=now.hour + 1),
        source=source,
    )


# ---------------------------------------------------------------------------
# iCal feed – fetch_ical_events
# ---------------------------------------------------------------------------

class TestFetchIcalEvents:
    def test_returns_empty_when_not_configured(self, monkeypatch):
        """Should return [] silently when no iCal URLs are configured."""
        monkeypatch.setattr("app.services.calendar_sync.settings.ICAL_URLS", "")
        from app.services.calendar_sync import fetch_ical_events
        result = fetch_ical_events()
        assert result == []

    def test_returns_empty_when_urls_are_blank(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.ICAL_URLS", "  ,  ")
        from app.services.calendar_sync import fetch_ical_events
        result = fetch_ical_events()
        assert result == []

    def test_returns_events_from_ical_feed(self, monkeypatch):
        """Should parse and return CalendarEvent objects from an iCal feed."""
        ical_content = b"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-uid-1@example.com
SUMMARY:Team Standup
DTSTART;TZID=Europe/Berlin:20240601T090000
DTEND;TZID=Europe/Berlin:20240601T093000
LOCATION:Office
END:VEVENT
END:VCALENDAR
"""
        mock_response = MagicMock()
        mock_response.content = ical_content
        mock_response.raise_for_status = MagicMock()

        monkeypatch.setattr(
            "app.services.calendar_sync.settings.ICAL_URLS",
            "https://example.com/calendar.ics",
        )

        import recurring_ical_events
        from icalendar import Calendar as ICalendar

        cal = ICalendar.from_ical(ical_content)
        fake_occurrences = list(recurring_ical_events.of(cal).between(
            datetime(2024, 6, 1, 0, 0, tzinfo=BERLIN_TZ),
            datetime(2024, 6, 2, 0, 0, tzinfo=BERLIN_TZ),
        ))

        with patch("app.services.calendar_sync.http_requests.get", return_value=mock_response), \
             patch("app.services.calendar_sync.recurring_ical_events.of") as mock_ri:
            mock_ri.return_value.between.return_value = fake_occurrences
            from app.services.calendar_sync import fetch_ical_events
            result = fetch_ical_events()

        assert isinstance(result, list)

    def test_logs_error_and_continues_on_bad_url(self, monkeypatch):
        """A failing URL must be skipped; other URLs still succeed."""
        monkeypatch.setattr(
            "app.services.calendar_sync.settings.ICAL_URLS",
            "https://bad.example.com/fail.ics",
        )
        with patch(
            "app.services.calendar_sync.http_requests.get",
            side_effect=Exception("connection refused"),
        ):
            from app.services.calendar_sync import fetch_ical_events
            result = fetch_ical_events()
        assert result == []


# ---------------------------------------------------------------------------
# iCal URL helpers
# ---------------------------------------------------------------------------

class TestGetIcalUrls:
    def test_parses_single_url(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.calendar_sync.settings.ICAL_URLS",
            "https://example.com/calendar.ics",
        )
        from app.services.calendar_sync import _get_ical_urls
        urls = _get_ical_urls()
        assert urls == ["https://example.com/calendar.ics"]

    def test_parses_comma_separated_urls(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.calendar_sync.settings.ICAL_URLS",
            "https://a.example.com/a.ics , https://b.example.com/b.ics",
        )
        from app.services.calendar_sync import _get_ical_urls
        urls = _get_ical_urls()
        assert len(urls) == 2
        assert "https://a.example.com/a.ics" in urls
        assert "https://b.example.com/b.ics" in urls

    def test_ignores_blank_entries(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.calendar_sync.settings.ICAL_URLS",
            " , https://example.com/calendar.ics , ",
        )
        from app.services.calendar_sync import _get_ical_urls
        urls = _get_ical_urls()
        assert len(urls) == 1

    def test_returns_empty_list_when_not_set(self, monkeypatch):
        monkeypatch.setattr("app.services.calendar_sync.settings.ICAL_URLS", "")
        from app.services.calendar_sync import _get_ical_urls
        assert _get_ical_urls() == []


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
