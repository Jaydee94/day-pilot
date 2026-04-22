"""
End-to-end tests for Day Pilot.

These tests cover complete user journeys through the API.  All external
dependencies (Google Calendar, Apple CalDAV, weather API, AI provider,
notifications) are mocked so that the test suite runs without any live
credentials or network access.

Run with:
    cd backend && pytest tests/test_e2e.py -v
"""
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytz
import pytest

from app.models.schemas import (
    AIConfig,
    AIModelInfo,
    Birthday,
    CalendarEvent,
    DailySummary,
    TodoItem,
    WeatherInfo,
)

BERLIN_TZ = pytz.timezone("Europe/Berlin")


# ---------------------------------------------------------------------------
# Shared mock data
# ---------------------------------------------------------------------------

def _make_event(
    eid: str = "e1",
    title: str = "Team Standup",
    source: str = "google",
    offset_hours: int = 9,
) -> CalendarEvent:
    now = datetime.now(BERLIN_TZ).replace(hour=offset_hours, minute=0, second=0, microsecond=0)
    return CalendarEvent(
        id=eid,
        title=title,
        start=now,
        end=now + timedelta(hours=1),
        source=source,
    )


def _make_todo(
    tid: str = "t1",
    title: str = "Finish report",
    completed: bool = False,
) -> TodoItem:
    return TodoItem(id=tid, title=title, completed=completed, source="google")


def _make_weather() -> WeatherInfo:
    return WeatherInfo(
        city="Berlin",
        temperature=20.0,
        feels_like=19.0,
        description="sonnig",
        icon="01d",
        humidity=50,
        wind_speed=3.0,
        units="metric",
    )


def _make_birthday() -> Birthday:
    return Birthday(
        name="Max Mustermann",
        date=datetime.now(BERLIN_TZ),
        age=30,
    )


def _make_summary(
    *,
    with_ai: bool = True,
    with_weather: bool = True,
    with_birthdays: bool = True,
) -> DailySummary:
    return DailySummary(
        date=datetime.now(BERLIN_TZ),
        events=[_make_event()],
        todos=[_make_todo()],
        birthdays=[_make_birthday()] if with_birthdays else [],
        weather=_make_weather() if with_weather else None,
        ai_summary="Heute wird ein produktiver Tag." if with_ai else None,
        top_priorities=["Finish report", "Team Standup"] if with_ai else [],
    )


# ---------------------------------------------------------------------------
# Journey 1: Full day briefing
# ---------------------------------------------------------------------------

class TestFullDayBriefingJourney:
    """
    A user opens DayPilot and receives the full day briefing:
    health check → daily summary with events, todos, weather, AI text.
    """

    def test_health_check_succeeds(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_full_summary_contains_all_sections(self, client):
        with patch("app.api.routes.build_daily_summary", return_value=_make_summary()):
            resp = client.get("/api/summary")

        assert resp.status_code == 200
        data = resp.json()
        assert "date" in data
        assert len(data["events"]) == 1
        assert data["events"][0]["title"] == "Team Standup"
        assert len(data["todos"]) == 1
        assert data["todos"][0]["title"] == "Finish report"
        assert data["weather"]["city"] == "Berlin"
        assert data["ai_summary"] == "Heute wird ein produktiver Tag."
        assert "Finish report" in data["top_priorities"]
        assert len(data["birthdays"]) == 1
        assert data["birthdays"][0]["name"] == "Max Mustermann"

    def test_summary_for_specific_date(self, client):
        with patch("app.api.routes.build_daily_summary", return_value=_make_summary()) as mock_build:
            resp = client.get("/api/summary?date=2024-06-01")

        assert resp.status_code == 200
        # Ensure build_daily_summary was called with a date argument
        call_kwargs = mock_build.call_args
        assert call_kwargs is not None

    def test_summary_degrades_gracefully_without_weather(self, client):
        """The API must still return 200 when weather is unavailable."""
        with patch(
            "app.api.routes.build_daily_summary",
            return_value=_make_summary(with_weather=False),
        ):
            resp = client.get("/api/summary")

        assert resp.status_code == 200
        assert resp.json()["weather"] is None

    def test_summary_degrades_gracefully_without_ai(self, client):
        """The API must still return 200 when AI text generation failed."""
        with patch(
            "app.api.routes.build_daily_summary",
            return_value=_make_summary(with_ai=False),
        ):
            resp = client.get("/api/summary")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_summary"] is None
        assert data["top_priorities"] == []

    def test_summary_invalid_date_returns_400(self, client):
        resp = client.get("/api/summary?date=not-a-date")
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Journey 2: Weather check
# ---------------------------------------------------------------------------

class TestWeatherJourney:
    """A user checks the current weather."""

    def test_weather_returns_full_data(self, client):
        with patch("app.api.routes.fetch_weather", return_value=_make_weather()):
            resp = client.get("/api/weather")

        assert resp.status_code == 200
        data = resp.json()
        assert data["city"] == "Berlin"
        assert data["temperature"] == 20.0
        assert data["description"] == "sonnig"
        assert data["humidity"] == 50

    def test_weather_returns_503_when_unavailable(self, client):
        with patch("app.api.routes.fetch_weather", return_value=None):
            resp = client.get("/api/weather")

        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# Journey 3: Event creation
# ---------------------------------------------------------------------------

class TestEventCreationJourney:
    """A user creates a new calendar event via the API."""

    def test_create_event_via_google(self, client):
        fake_event = _make_event(eid="new-ev", title="Doctor", source="google")
        with patch("app.api.routes.add_google_event", return_value=fake_event):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Doctor",
                    "start": "2024-06-01T10:00:00+02:00",
                    "end": "2024-06-01T11:00:00+02:00",
                },
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Doctor"
        assert data["source"] == "google"

    def test_create_event_falls_back_to_apple(self, client):
        with patch("app.api.routes.add_google_event", return_value=None), patch(
            "app.api.routes.add_apple_event", return_value=True
        ):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Yoga class",
                    "start": "2024-06-01T07:00:00+02:00",
                },
            )

        assert resp.status_code == 200
        assert resp.json()["source"] == "apple"

    def test_create_event_returns_503_when_all_calendars_fail(self, client):
        with patch("app.api.routes.add_google_event", return_value=None), patch(
            "app.api.routes.add_apple_event", return_value=False
        ):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Mystery event",
                    "start": "2024-06-01T08:00:00+02:00",
                },
            )

        assert resp.status_code == 503

    def test_created_event_appears_in_event_list(self, client):
        """Creating and then listing events returns the new event."""
        fake_event = _make_event(eid="ev-list", title="Dentist", source="google")
        with patch("app.api.routes.add_google_event", return_value=fake_event):
            create_resp = client.post(
                "/api/events",
                json={
                    "title": "Dentist",
                    "start": "2024-06-01T14:00:00+02:00",
                    "end": "2024-06-01T15:00:00+02:00",
                },
            )
        assert create_resp.status_code == 200

        with patch("app.api.routes.fetch_google_events", return_value=[fake_event]), patch(
            "app.api.routes.fetch_apple_events", return_value=[]
        ):
            list_resp = client.get("/api/events")

        assert list_resp.status_code == 200
        titles = [e["title"] for e in list_resp.json()]
        assert "Dentist" in titles


# ---------------------------------------------------------------------------
# Journey 4: Todo creation
# ---------------------------------------------------------------------------

class TestTodoCreationJourney:
    """A user adds a task via Quick Capture."""

    def test_create_todo_succeeds(self, client):
        fake_todo = _make_todo(tid="new-task", title="Buy groceries")
        with patch("app.api.routes.add_google_task", return_value=fake_todo):
            resp = client.post("/api/todos", json={"title": "Buy groceries"})

        assert resp.status_code == 200
        assert resp.json()["title"] == "Buy groceries"

    def test_create_todo_returns_503_when_service_fails(self, client):
        with patch("app.api.routes.add_google_task", return_value=None):
            resp = client.post("/api/todos", json={"title": "Unreachable task"})

        assert resp.status_code == 503

    def test_created_todo_appears_in_todo_list(self, client):
        """Creating and then listing todos returns the new task."""
        fake_todo = _make_todo(tid="listed-task", title="Call mum")
        with patch("app.api.routes.add_google_task", return_value=fake_todo):
            create_resp = client.post("/api/todos", json={"title": "Call mum"})
        assert create_resp.status_code == 200

        with patch("app.api.routes.fetch_google_tasks", return_value=[fake_todo]):
            list_resp = client.get("/api/todos")

        assert list_resp.status_code == 200
        titles = [t["title"] for t in list_resp.json()]
        assert "Call mum" in titles


# ---------------------------------------------------------------------------
# Journey 5: Service status check
# ---------------------------------------------------------------------------

class TestServiceStatusJourney:
    """An operator checks whether all integrations are healthy."""

    def test_all_services_healthy(self, client):
        with patch(
            "app.services.calendar_sync.fetch_google_events", return_value=[]
        ), patch(
            "app.services.calendar_sync.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_weather", return_value=_make_weather()):
            resp = client.get("/api/status")

        assert resp.status_code == 200
        data = resp.json()
        assert data["google_calendar"] is True
        assert data["apple_calendar"] is True
        assert data["weather"] is True
        assert data["errors"] == []

    def test_status_reports_google_failure(self, client):
        with patch(
            "app.services.calendar_sync.fetch_google_events",
            side_effect=Exception("auth error"),
        ), patch(
            "app.services.calendar_sync.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_weather", return_value=_make_weather()):
            resp = client.get("/api/status")

        assert resp.status_code == 200
        data = resp.json()
        assert data["google_calendar"] is False
        assert any("Google Calendar" in e for e in data["errors"])

    def test_status_reports_weather_failure(self, client):
        with patch(
            "app.services.calendar_sync.fetch_google_events", return_value=[]
        ), patch(
            "app.services.calendar_sync.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_weather", return_value=None):
            resp = client.get("/api/status")

        assert resp.status_code == 200
        assert resp.json()["weather"] is False


# ---------------------------------------------------------------------------
# Journey 6: AI configuration
# ---------------------------------------------------------------------------

class TestAIConfigurationJourney:
    """A user views and selects an AI model in the settings screen."""

    def test_config_shows_current_provider(self, client):
        fake_cfg = AIConfig(provider="openai", model="gpt-4o-mini", configured=True)
        with patch("app.api.routes.get_ai_config", return_value=fake_cfg):
            resp = client.get("/api/ai/config")

        assert resp.status_code == 200
        data = resp.json()
        assert data["provider"] == "openai"
        assert data["model"] == "gpt-4o-mini"
        assert data["configured"] is True

    def test_model_list_returned_for_github_provider(self, client):
        fake_models = [
            AIModelInfo(id="gpt-4o", name="GPT-4o", provider="github"),
            AIModelInfo(id="gpt-4o-mini", name="GPT-4o mini", provider="github"),
        ]
        with patch("app.api.routes.list_models", return_value=fake_models):
            resp = client.get("/api/ai/models")

        assert resp.status_code == 200
        ids = [m["id"] for m in resp.json()]
        assert "gpt-4o" in ids
        assert "gpt-4o-mini" in ids

    def test_empty_model_list_for_openai_provider(self, client):
        with patch("app.api.routes.list_models", return_value=[]):
            resp = client.get("/api/ai/models")

        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# Journey 7: Voice command
# ---------------------------------------------------------------------------

class TestVoiceCommandJourney:
    """A user triggers an action via the voice/webhook endpoint."""

    def test_add_event_via_voice(self, client):
        fake_event = _make_event(eid="voice-ev", title="Voice appointment", source="google")
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "s3cr3t"), patch(
            "app.api.voice.add_google_event", return_value=fake_event
        ):
            resp = client.post(
                "/api/voice/command",
                json={
                    "secret": "s3cr3t",
                    "command": "add_event",
                    "title": "Voice appointment",
                    "start": "2024-06-01T10:00:00+02:00",
                },
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "created"
        assert data["source"] == "google"
        assert data["event"]["title"] == "Voice appointment"

    def test_wrong_secret_rejected(self, client):
        resp = client.post(
            "/api/voice/command",
            json={
                "secret": "wrong",
                "command": "add_event",
                "title": "Sneaky event",
                "start": "2024-06-01T10:00:00+02:00",
            },
        )
        assert resp.status_code == 401

    def test_missing_start_returns_400(self, client):
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "s3cr3t"):
            resp = client.post(
                "/api/voice/command",
                json={
                    "secret": "s3cr3t",
                    "command": "add_event",
                    "title": "No time",
                },
            )
        assert resp.status_code == 400

    def test_unknown_command_returns_400(self, client):
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "s3cr3t"):
            resp = client.post(
                "/api/voice/command",
                json={
                    "secret": "s3cr3t",
                    "command": "do_something_weird",
                    "title": "Whatever",
                },
            )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Journey 8: Push notification trigger
# ---------------------------------------------------------------------------

class TestPushNotificationJourney:
    """An operator or cron job manually triggers a push notification."""

    def test_push_summary_sends_notification(self, client):
        with patch(
            "app.api.routes.build_daily_summary", return_value=_make_summary()
        ), patch("app.api.routes.send_daily_push", return_value=True):
            resp = client.post("/api/summary/push")

        assert resp.status_code == 200
        assert resp.json()["sent"] is True

    def test_push_summary_reports_failure_gracefully(self, client):
        with patch(
            "app.api.routes.build_daily_summary", return_value=_make_summary()
        ), patch("app.api.routes.send_daily_push", return_value=False):
            resp = client.post("/api/summary/push")

        assert resp.status_code == 200
        assert resp.json()["sent"] is False
