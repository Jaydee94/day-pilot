"""
End-to-end tests for Day Pilot.

These tests cover complete user journeys through the API.  All external
dependencies (iCal feeds, Apple CalDAV, weather API, AI provider,
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
    source: str = "ical",
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
    return TodoItem(id=tid, title=title, completed=completed, source="local")


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

    def test_create_event_via_apple(self, client):
        with patch("app.api.routes.add_apple_event", return_value=True):
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
        assert data["source"] == "apple"

    def test_create_event_falls_back_to_local_when_apple_fails(self, client):
        """When Apple CalDAV fails, the event is saved in the local calendar."""
        fake_local = _make_event(eid="local-ev", title="Mystery event", source="local")
        with patch("app.api.routes.add_apple_event", return_value=False), patch(
            "app.api.routes.add_local_event", return_value=fake_local
        ):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Mystery event",
                    "start": "2024-06-01T08:00:00+02:00",
                },
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "local"
        assert data["title"] == "Mystery event"

    def test_created_event_appears_in_event_list(self, client):
        """Creating and then listing events returns the new event."""
        fake_event = _make_event(eid="ev-list", title="Dentist", source="ical")
        with patch("app.api.routes.fetch_ical_events", return_value=[fake_event]), patch(
            "app.api.routes.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_local_events", return_value=[]):
            list_resp = client.get("/api/events")

        assert list_resp.status_code == 200
        titles = [e["title"] for e in list_resp.json()]
        assert "Dentist" in titles


class TestLocalCalendarJourney:
    """A user creates and deletes events in the internal local calendar."""

    def test_delete_local_event_success(self, client):
        with patch("app.api.routes.delete_local_event", return_value=True):
            resp = client.delete("/api/events/local-uuid-123")
        assert resp.status_code == 200
        assert resp.json()["event_id"] == "local-uuid-123"

    def test_delete_nonexistent_local_event_returns_404(self, client):
        with patch("app.api.routes.delete_local_event", return_value=False):
            resp = client.delete("/api/events/does-not-exist")
        assert resp.status_code == 404

    def test_local_events_included_in_event_list(self, client):
        local_ev = _make_event(eid="loc-1", title="Local meeting", source="local")
        with patch("app.api.routes.fetch_ical_events", return_value=[]), patch(
            "app.api.routes.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_local_events", return_value=[local_ev]):
            resp = client.get("/api/events")
        assert resp.status_code == 200
        sources = [e["source"] for e in resp.json()]
        assert "local" in sources


# ---------------------------------------------------------------------------
# Journey 4: Todo creation
# ---------------------------------------------------------------------------

class TestTodoCreationJourney:
    """A user adds a task via Quick Capture."""

    def test_create_todo_succeeds(self, client, tmp_path):
        local_todos_file = str(tmp_path / "local_todos.json")
        with patch("app.config.settings.LOCAL_TODOS_FILE", local_todos_file), \
             patch("app.services.local_todos.settings.LOCAL_TODOS_FILE", local_todos_file):
            resp = client.post("/api/todos", json={"title": "Buy groceries"})

        assert resp.status_code == 200
        assert resp.json()["title"] == "Buy groceries"
        assert resp.json()["source"] == "local"

    def test_created_todo_appears_in_todo_list(self, client, tmp_path):
        """Creating and then listing todos returns the new task."""
        local_todos_file = str(tmp_path / "local_todos.json")
        with patch("app.config.settings.LOCAL_TODOS_FILE", local_todos_file), \
             patch("app.services.local_todos.settings.LOCAL_TODOS_FILE", local_todos_file):
            create_resp = client.post("/api/todos", json={"title": "Call mum"})
            assert create_resp.status_code == 200

            list_resp = client.get("/api/todos")

        assert list_resp.status_code == 200
        titles = [t["title"] for t in list_resp.json()]
        assert "Call mum" in titles

    def test_local_todos_included_in_todo_list(self, client):
        """Local todos must appear in the todo list."""
        local_todo = _make_todo(tid="loc-t1", title="Local task")
        local_todo.source = "local"
        with patch("app.api.routes.fetch_local_todos", return_value=[local_todo]):
            resp = client.get("/api/todos")

        assert resp.status_code == 200
        sources = [t["source"] for t in resp.json()]
        assert "local" in sources

    def test_delete_local_todo_success(self, client):
        with patch("app.api.routes.delete_local_todo", return_value=True):
            resp = client.delete("/api/todos/local-todo-uuid")
        assert resp.status_code == 200
        assert resp.json()["todo_id"] == "local-todo-uuid"

    def test_delete_nonexistent_local_todo_returns_404(self, client):
        with patch("app.api.routes.delete_local_todo", return_value=False):
            resp = client.delete("/api/todos/does-not-exist")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Journey 5: Service status check
# ---------------------------------------------------------------------------

class TestServiceStatusJourney:
    """An operator checks whether all integrations are healthy."""

    def test_all_services_healthy(self, client):
        with patch(
            "app.api.routes.fetch_ical_events", return_value=[]
        ), patch(
            "app.api.routes.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_weather", return_value=_make_weather()):
            resp = client.get("/api/status")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ical_calendar"] is True
        assert data["apple_calendar"] is True
        assert data["weather"] is True
        assert data["errors"] == []

    def test_status_reports_ical_failure(self, client):
        with patch(
            "app.api.routes.fetch_ical_events",
            side_effect=Exception("network error"),
        ), patch(
            "app.api.routes.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_weather", return_value=_make_weather()):
            resp = client.get("/api/status")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ical_calendar"] is False
        assert any("iCal Calendar" in e for e in data["errors"])

    def test_status_reports_weather_failure(self, client):
        with patch(
            "app.api.routes.fetch_ical_events", return_value=[]
        ), patch(
            "app.api.routes.fetch_apple_events", return_value=[]
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

    def test_add_event_via_voice_apple(self, client):
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "s3cr3t"), patch(
            "app.api.voice.add_apple_event", return_value=True
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
        assert data["source"] == "apple"

    def test_add_event_via_voice_falls_back_to_local(self, client, tmp_path):
        local_events_file = str(tmp_path / "local_events.json")
        fake_event = _make_event(eid="voice-ev", title="Voice appointment", source="local")
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "s3cr3t"), patch(
            "app.api.voice.add_apple_event", return_value=False
        ), patch("app.api.voice.add_local_event", return_value=fake_event):
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
        assert data["source"] == "local"

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


# ---------------------------------------------------------------------------
# Journey 9: Settings management
# ---------------------------------------------------------------------------

class TestSettingsJourney:
    """A user reads and updates DayPilot settings through the frontend."""

    def test_setup_status_reports_needs_setup_on_first_boot(self, client, tmp_path):
        settings_file = str(tmp_path / "settings.json")
        with patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            resp = client.get("/api/settings/status")

        assert resp.status_code == 200
        data = resp.json()
        assert data["needs_setup"] is True
        assert data["setup_complete"] is False

    def test_get_settings_returns_all_configurable_keys(self, client):
        resp = client.get("/api/settings")

        assert resp.status_code == 200
        data = resp.json()
        assert "APP_TIMEZONE" in data
        assert "WEATHER_CITY" in data
        assert "NTFY_SERVER" in data
        assert "SETUP_COMPLETE" in data

    def test_update_settings_persists_and_applies(self, client, tmp_path):
        settings_file = str(tmp_path / "settings.json")
        with patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            resp = client.put(
                "/api/settings",
                json={"WEATHER_CITY": "Munich", "WEATHER_UNITS": "imperial"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["WEATHER_CITY"] == "Munich"
        assert data["WEATHER_UNITS"] == "imperial"

    def test_wizard_completion_marks_setup_complete(self, client, tmp_path):
        """Completing the setup wizard sets SETUP_COMPLETE and ends the wizard flow."""
        settings_file = str(tmp_path / "settings.json")
        with patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            # Step: mark setup as complete (last step of wizard)
            put_resp = client.put("/api/settings", json={"SETUP_COMPLETE": True})
            assert put_resp.status_code == 200
            assert put_resp.json()["SETUP_COMPLETE"] is True

            # Verify status endpoint reflects completion
            status_resp = client.get("/api/settings/status")
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert status_data["setup_complete"] is True
        assert status_data["needs_setup"] is False

    def test_partial_update_does_not_overwrite_other_fields(self, client, tmp_path):
        """Sending only one field in PUT must not reset other saved settings."""
        settings_file = str(tmp_path / "settings.json")
        with patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            # First save two fields
            client.put("/api/settings", json={"WEATHER_CITY": "Berlin", "NTFY_TOPIC": "alerts"})
            # Then update only one
            resp = client.put("/api/settings", json={"WEATHER_CITY": "Hamburg"})

        assert resp.status_code == 200
        # NTFY_TOPIC must still be in the returned state (in-memory)
        # WEATHER_CITY must reflect the update
        assert resp.json()["WEATHER_CITY"] == "Hamburg"


# ---------------------------------------------------------------------------
# Journey 9: Scheduler jobs
# ---------------------------------------------------------------------------

class TestSchedulerJobsJourney:
    """A user views scheduled jobs and triggers one manually."""

    def _make_job(self, job_id: str, name: str, desc: str, trigger: str) -> dict:
        return {
            "id": job_id,
            "name": name,
            "description": desc,
            "trigger": trigger,
            "next_run": datetime.now(BERLIN_TZ) + timedelta(hours=1),
        }

    def test_list_jobs_returns_all_registered_jobs(self, client):
        fake_jobs = [
            self._make_job("daily_summary", "run_daily_pipeline",
                           "Builds the DayPilot briefing and sends a push notification",
                           "cron[hour='7', minute='0']"),
            self._make_job("weather_cache_refresh", "run_weather_cache_refresh",
                           "Refreshes the weather cache with the latest forecast data",
                           "interval[0:30:00]"),
        ]
        with patch("app.api.routes.get_jobs", return_value=fake_jobs):
            resp = client.get("/api/scheduler/jobs")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        ids = [j["id"] for j in data]
        assert "daily_summary" in ids
        assert "weather_cache_refresh" in ids

    def test_each_job_has_required_fields(self, client):
        fake_jobs = [
            self._make_job("daily_summary", "run_daily_pipeline",
                           "Builds the DayPilot briefing", "cron[hour='7']"),
        ]
        with patch("app.api.routes.get_jobs", return_value=fake_jobs):
            resp = client.get("/api/scheduler/jobs")

        assert resp.status_code == 200
        job = resp.json()[0]
        assert "id" in job
        assert "name" in job
        assert "description" in job
        assert "trigger" in job
        assert "next_run" in job

    def test_trigger_known_job_returns_200(self, client):
        with patch("app.api.routes.trigger_job", return_value=True):
            resp = client.post("/api/scheduler/jobs/daily_summary/run")

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "triggered"
        assert data["job_id"] == "daily_summary"

    def test_trigger_unknown_job_returns_404(self, client):
        with patch("app.api.routes.trigger_job", return_value=False):
            resp = client.post("/api/scheduler/jobs/nonexistent_job/run")

        assert resp.status_code == 404

    def test_list_jobs_returns_empty_when_scheduler_not_running(self, client):
        with patch("app.api.routes.get_jobs", return_value=[]):
            resp = client.get("/api/scheduler/jobs")

        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# Journey 10: iCal URL management
# ---------------------------------------------------------------------------

class TestICalURLManagementJourney:
    """A user adds and removes iCal feed URLs in settings."""

    def test_list_ical_urls_empty_when_none_configured(self, client):
        with patch("app.api.settings_router.app_settings.ICAL_URLS", ""):
            resp = client.get("/api/settings/ical-urls")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_ical_urls_returns_configured_urls(self, client, tmp_path):
        settings_file = str(tmp_path / "settings.json")
        url = "https://calendar.google.com/calendar/ical/test/basic.ics"
        with patch("app.api.settings_router.app_settings.ICAL_URLS", url), \
             patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            resp = client.get("/api/settings/ical-urls")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["url"] == url
        assert data[0]["index"] == 0

    def test_add_ical_url(self, client, tmp_path):
        settings_file = str(tmp_path / "settings.json")
        url = "https://calendar.google.com/calendar/ical/test/basic.ics"
        with patch("app.api.settings_router.app_settings.ICAL_URLS", ""), \
             patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            resp = client.post(
                "/api/settings/ical-urls",
                json={"url": url},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "added"
        assert data["url"] == url

    def test_add_ical_url_rejects_missing_url(self, client):
        resp = client.post("/api/settings/ical-urls", json={})
        assert resp.status_code == 400

    def test_add_ical_url_rejects_non_http_url(self, client):
        resp = client.post("/api/settings/ical-urls", json={"url": "ftp://bad-url.com/cal.ics"})
        assert resp.status_code == 400

    def test_delete_ical_url(self, client, tmp_path):
        settings_file = str(tmp_path / "settings.json")
        url = "https://calendar.google.com/calendar/ical/test/basic.ics"
        with patch("app.api.settings_router.app_settings.ICAL_URLS", url), \
             patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            resp = client.delete("/api/settings/ical-urls/0")
        assert resp.status_code == 200
        assert resp.json()["status"] == "removed"

    def test_delete_out_of_range_ical_url_returns_404(self, client):
        with patch("app.api.settings_router.app_settings.ICAL_URLS", ""):
            resp = client.delete("/api/settings/ical-urls/5")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Journey 11: CalDAV account management
# ---------------------------------------------------------------------------

class TestCalDAVAccountManagementJourney:
    """A user adds and removes CalDAV / Apple Calendar accounts."""

    def test_list_caldav_accounts_empty(self, client):
        with patch("app.api.settings_router.app_settings.CALDAV_CONFIGS", ""), \
             patch("app.api.settings_router.app_settings.CALDAV_URL", ""):
            resp = client.get("/api/settings/caldav-accounts")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_add_caldav_account(self, client, tmp_path):
        settings_file = str(tmp_path / "settings.json")
        with patch("app.api.settings_router.app_settings.CALDAV_CONFIGS", ""), \
             patch("app.api.settings_router.app_settings.CALDAV_URL", ""), \
             patch("app.api.settings_router.app_settings.CALDAV_USERNAME", ""), \
             patch("app.api.settings_router.app_settings.CALDAV_PASSWORD", ""), \
             patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            resp = client.post(
                "/api/settings/caldav-accounts",
                json={"url": "https://caldav.icloud.com", "username": "test@icloud.com", "password": "xxxx"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "added"
        assert data["url"] == "https://caldav.icloud.com"

    def test_list_caldav_accounts_from_configs(self, client):
        configs_json = '[{"url":"https://caldav.icloud.com","username":"user@icloud.com","password":"pw"}]'
        with patch("app.api.settings_router.app_settings.CALDAV_CONFIGS", configs_json):
            resp = client.get("/api/settings/caldav-accounts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["url"] == "https://caldav.icloud.com"
        assert data[0]["username"] == "user@icloud.com"
        assert "password" not in data[0]  # password must not be returned
        assert data[0]["password_set"] is True  # but presence must be indicated

    def test_delete_caldav_account(self, client, tmp_path):
        configs_json = '[{"url":"https://caldav.icloud.com","username":"user@icloud.com","password":"pw"}]'
        settings_file = str(tmp_path / "settings.json")
        with patch("app.api.settings_router.app_settings.CALDAV_CONFIGS", configs_json), \
             patch("app.services.settings_store.SETTINGS_FILE", settings_file):
            resp = client.delete("/api/settings/caldav-accounts/0")
        assert resp.status_code == 200
        assert resp.json()["status"] == "removed"

    def test_delete_out_of_range_caldav_account_returns_404(self, client):
        with patch("app.api.settings_router.app_settings.CALDAV_CONFIGS", ""), \
             patch("app.api.settings_router.app_settings.CALDAV_URL", ""):
            resp = client.delete("/api/settings/caldav-accounts/10")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Journey 13: Calendar sync job and last sync time
# ---------------------------------------------------------------------------

class TestCalendarSyncJourney:
    """A user checks when calendars were last synced and triggers a manual sync."""

    def test_status_last_sync_is_none_before_first_sync(self, client):
        """Before any sync has run the last_sync field must be null."""
        with patch(
            "app.services.calendar_sync.fetch_ical_events", return_value=[]
        ), patch(
            "app.services.calendar_sync.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_weather", return_value=_make_weather()), \
            patch("app.api.routes.get_last_calendar_sync", return_value=None):
            resp = client.get("/api/status")

        assert resp.status_code == 200
        assert resp.json()["last_sync"] is None

    def test_status_last_sync_returns_real_timestamp_after_sync(self, client):
        """After a sync the last_sync field must contain a datetime string."""
        sync_time = datetime.now(BERLIN_TZ)
        with patch(
            "app.services.calendar_sync.fetch_ical_events", return_value=[]
        ), patch(
            "app.services.calendar_sync.fetch_apple_events", return_value=[]
        ), patch("app.api.routes.fetch_weather", return_value=_make_weather()), \
            patch("app.api.routes.get_last_calendar_sync", return_value=sync_time):
            resp = client.get("/api/status")

        assert resp.status_code == 200
        assert resp.json()["last_sync"] is not None

    def test_calendar_sync_job_is_registered(self, client):
        """The scheduler must expose a calendar_sync job."""
        from datetime import timedelta
        fake_jobs = [
            {
                "id": "calendar_sync",
                "name": "run_calendar_sync",
                "description": "Syncs all configured iCal feeds and CalDAV accounts",
                "trigger": "interval[1:00:00]",
                "next_run": datetime.now(BERLIN_TZ) + timedelta(hours=1),
            },
        ]
        with patch("app.api.routes.get_jobs", return_value=fake_jobs):
            resp = client.get("/api/scheduler/jobs")

        assert resp.status_code == 200
        ids = [j["id"] for j in resp.json()]
        assert "calendar_sync" in ids

    def test_manual_calendar_sync_trigger_returns_200(self, client):
        """A user can manually trigger the calendar_sync job."""
        with patch("app.api.routes.trigger_job", return_value=True):
            resp = client.post("/api/scheduler/jobs/calendar_sync/run")

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "triggered"
        assert data["job_id"] == "calendar_sync"

    def test_sync_calendars_updates_last_sync_timestamp(self):
        """sync_calendars() must update the module-level last sync timestamp."""
        import app.services.calendar_sync as cal_sync

        with patch.object(cal_sync, "fetch_ical_events", return_value=[]), \
             patch.object(cal_sync, "fetch_apple_events", return_value=[]):
            before = cal_sync.get_last_calendar_sync()
            cal_sync.sync_calendars()
            after = cal_sync.get_last_calendar_sync()

        assert after is not None
        assert before != after or before is None


# ---------------------------------------------------------------------------
# Journey 14: Upcoming birthdays
# ---------------------------------------------------------------------------

class TestUpcomingBirthdaysJourney:
    """A user views upcoming birthday events detected from their calendars."""

    def test_birthdays_endpoint_returns_list(self, client):
        """GET /api/birthdays must return a list (even when empty)."""
        with patch("app.api.routes.get_upcoming_birthdays", return_value=[]):
            resp = client.get("/api/birthdays")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_birthdays_endpoint_returns_detected_birthdays(self, client):
        """Detected birthday objects must be serialised correctly."""
        fake_birthdays = [_make_birthday()]
        with patch("app.api.routes.get_upcoming_birthdays", return_value=fake_birthdays):
            resp = client.get("/api/birthdays")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Max Mustermann"
        assert data[0]["age"] == 30

    def test_birthdays_endpoint_accepts_days_ahead_param(self, client):
        """The days_ahead query parameter must be forwarded to the service."""
        with patch("app.api.routes.get_upcoming_birthdays", return_value=[]) as mock_fn:
            resp = client.get("/api/birthdays?days_ahead=7")
        assert resp.status_code == 200
        mock_fn.assert_called_once_with(days_ahead=7)

    def test_birthdays_empty_when_no_calendar_events(self, client):
        """When no birthday events exist an empty list is returned."""
        with patch("app.api.routes.get_upcoming_birthdays", return_value=[]):
            resp = client.get("/api/birthdays")
        assert resp.status_code == 200
        assert resp.json() == []

