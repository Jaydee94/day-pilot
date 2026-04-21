"""
Integration tests for the FastAPI routes.
"""
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

import pytz

from app.models.schemas import DailySummary, WeatherInfo


BERLIN_TZ = pytz.timezone("Europe/Berlin")


def _make_summary():
    return DailySummary(
        date=datetime.now(BERLIN_TZ),
        weather=WeatherInfo(
            city="Berlin",
            temperature=20.0,
            feels_like=19.0,
            description="sonnig",
            icon="01d",
            humidity=50,
            wind_speed=3.0,
            units="metric",
        ),
        ai_summary="Guter Tag heute!",
        top_priorities=["Task A", "Task B"],
    )


@pytest.fixture()
def client():
    # Patch scheduler so tests don't spin up real APScheduler
    with patch("app.services.scheduler.start_scheduler"), patch(
        "app.services.scheduler.stop_scheduler"
    ):
        from app.main import app
        with TestClient(app) as c:
            yield c


class TestHealthRoutes:
    def test_root(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestSummaryRoute:
    def test_get_summary(self, client):
        with patch(
            "app.api.routes.build_daily_summary", return_value=_make_summary()
        ):
            resp = client.get("/api/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "date" in data
        assert "events" in data
        assert data["ai_summary"] == "Guter Tag heute!"

    def test_get_summary_with_date(self, client):
        with patch(
            "app.api.routes.build_daily_summary", return_value=_make_summary()
        ):
            resp = client.get("/api/summary?date=2024-06-01")
        assert resp.status_code == 200

    def test_get_summary_invalid_date(self, client):
        resp = client.get("/api/summary?date=not-a-date")
        assert resp.status_code == 400


class TestWeatherRoute:
    def test_get_weather_success(self, client):
        with patch(
            "app.api.routes.fetch_weather",
            return_value=WeatherInfo(
                city="Berlin",
                temperature=22.0,
                feels_like=21.0,
                description="klar",
                icon="01d",
                humidity=45,
                wind_speed=2.5,
                units="metric",
            ),
        ):
            resp = client.get("/api/weather")
        assert resp.status_code == 200
        assert resp.json()["city"] == "Berlin"

    def test_get_weather_unavailable(self, client):
        with patch("app.api.routes.fetch_weather", return_value=None):
            resp = client.get("/api/weather")
        assert resp.status_code == 503


class TestEventsRoute:
    def test_create_event_success(self, client):
        from app.models.schemas import CalendarEvent

        fake_event = CalendarEvent(
            id="new-ev-1",
            title="Team lunch",
            start=datetime(2024, 6, 1, 12, 0, tzinfo=BERLIN_TZ),
            end=datetime(2024, 6, 1, 13, 0, tzinfo=BERLIN_TZ),
            source="google",
        )
        with patch("app.api.routes.add_google_event", return_value=fake_event):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Team lunch",
                    "start": "2024-06-01T12:00:00+02:00",
                    "end": "2024-06-01T13:00:00+02:00",
                },
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Team lunch"
        assert data["source"] == "google"

    def test_create_event_falls_back_to_apple(self, client):
        with patch("app.api.routes.add_google_event", return_value=None), patch(
            "app.api.routes.add_apple_event", return_value=True
        ):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Doctor",
                    "start": "2024-06-01T09:00:00+02:00",
                },
            )
        assert resp.status_code == 200
        assert resp.json()["source"] == "apple"

    def test_create_event_service_unavailable(self, client):
        with patch("app.api.routes.add_google_event", return_value=None), patch(
            "app.api.routes.add_apple_event", return_value=False
        ):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Broken event",
                    "start": "2024-06-01T09:00:00+02:00",
                },
            )
        assert resp.status_code == 503


class TestTodosRoute:
    def test_create_todo_success(self, client):
        from app.models.schemas import TodoItem

        fake_todo = TodoItem(
            id="task-1",
            title="Pick up groceries",
            completed=False,
            source="google",
        )
        with patch("app.api.routes.add_google_task", return_value=fake_todo):
            resp = client.post(
                "/api/todos",
                json={"title": "Pick up groceries"},
            )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Pick up groceries"

    def test_create_todo_service_unavailable(self, client):
        with patch("app.api.routes.add_google_task", return_value=None):
            resp = client.post("/api/todos", json={"title": "Broken task"})
        assert resp.status_code == 503

    def test_add_event_wrong_secret(self, client):
        payload = {
            "secret": "wrong-secret",
            "command": "add_event",
            "title": "Doctor appointment",
            "start": "2024-06-01T10:00:00+02:00",
        }
        resp = client.post("/api/voice/command", json=payload)
        assert resp.status_code == 401

    def test_add_event_success(self, client):
        from app.models.schemas import CalendarEvent

        fake_event = CalendarEvent(
            id="new-ev",
            title="Doctor appointment",
            start=datetime(2024, 6, 1, 10, 0, tzinfo=BERLIN_TZ),
            end=datetime(2024, 6, 1, 11, 0, tzinfo=BERLIN_TZ),
            source="google",
        )
        with patch(
            "app.api.voice.settings.VOICE_WEBHOOK_SECRET", "test-secret"
        ), patch("app.api.voice.add_google_event", return_value=fake_event):
            payload = {
                "secret": "test-secret",
                "command": "add_event",
                "title": "Doctor appointment",
                "start": "2024-06-01T10:00:00+02:00",
            }
            resp = client.post("/api/voice/command", json=payload)
        assert resp.status_code == 200
        assert resp.json()["source"] == "google"

    def test_add_event_missing_start(self, client):
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "test-secret"):
            payload = {
                "secret": "test-secret",
                "command": "add_event",
                "title": "No time event",
            }
            resp = client.post("/api/voice/command", json=payload)
        assert resp.status_code == 400

    def test_unknown_command(self, client):
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "test-secret"):
            payload = {
                "secret": "test-secret",
                "command": "unknown_cmd",
                "title": "Whatever",
            }
            resp = client.post("/api/voice/command", json=payload)
        assert resp.status_code == 400
