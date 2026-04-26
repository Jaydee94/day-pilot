"""
Integration tests for the FastAPI routes.
"""
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytest

import pytz

from app.models.schemas import DailySummary, WeatherInfo, TodoItem


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
        with patch("app.api.routes.add_apple_event", return_value=True):
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
        assert data["source"] == "apple"

    def test_create_event_falls_back_to_local(self, client):
        from app.models.schemas import CalendarEvent
        import pytz
        from datetime import datetime, timedelta

        tz = pytz.timezone("Europe/Berlin")
        start = datetime(2024, 6, 1, 9, 0, tzinfo=tz)
        fake_local = CalendarEvent(
            id="local-1",
            title="Doctor",
            start=start,
            end=start + timedelta(hours=1),
            source="local",
        )
        with patch("app.api.routes.add_apple_event", return_value=False), patch(
            "app.api.routes.add_local_event", return_value=fake_local
        ):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Doctor",
                    "start": "2024-06-01T09:00:00+02:00",
                },
            )
        assert resp.status_code == 200
        assert resp.json()["source"] == "local"

    def test_update_event_success(self, client):
        from app.models.schemas import CalendarEvent
        from datetime import timedelta

        start = datetime(2024, 6, 1, 9, 0, tzinfo=BERLIN_TZ)
        updated_event = CalendarEvent(
            id="local-1",
            title="Updated title",
            start=start,
            end=start + timedelta(hours=1),
            source="local",
        )
        with patch("app.api.routes.update_local_event", return_value=updated_event):
            resp = client.put("/api/events/local-1", json={"title": "Updated title"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated title"
        assert resp.json()["source"] == "local"

    def test_update_event_not_found(self, client):
        with patch("app.api.routes.update_local_event", return_value=None):
            resp = client.put("/api/events/nonexistent-id", json={"title": "Nope"})
        assert resp.status_code == 404

    def test_create_event_service_unavailable(self, client):
        """When Apple CalDAV fails the event is saved locally (source='local')."""
        from app.models.schemas import CalendarEvent
        import pytz
        from datetime import datetime, timedelta

        tz = pytz.timezone("Europe/Berlin")
        start = datetime(2024, 6, 1, 9, 0, tzinfo=tz)
        fake_local = CalendarEvent(
            id="local-1",
            title="Broken event",
            start=start,
            end=start + timedelta(hours=1),
            source="local",
        )
        with patch("app.api.routes.add_apple_event", return_value=False), patch(
            "app.api.routes.add_local_event", return_value=fake_local
        ):
            resp = client.post(
                "/api/events",
                json={
                    "title": "Broken event",
                    "start": "2024-06-01T09:00:00+02:00",
                },
            )
        assert resp.status_code == 200
        assert resp.json()["source"] == "local"


class TestTodosRoute:
    def test_create_todo_success(self, client, tmp_path):
        local_todos_file = str(tmp_path / "local_todos.json")
        with patch("app.config.settings.LOCAL_TODOS_FILE", local_todos_file), \
             patch("app.services.local_todos.settings.LOCAL_TODOS_FILE", local_todos_file):
            resp = client.post(
                "/api/todos",
                json={"title": "Pick up groceries"},
            )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Pick up groceries"
        assert resp.json()["source"] == "local"

    def test_create_todo_service_unavailable(self, client, tmp_path):
        """Todo creation always saves to local storage."""
        from app.models.schemas import TodoItem
        fake_local_todo = TodoItem(id="local-1", title="Broken task", completed=False, source="local")
        with patch("app.api.routes.add_local_todo", return_value=fake_local_todo):
            resp = client.post("/api/todos", json={"title": "Broken task"})
        assert resp.status_code == 200
        assert resp.json()["source"] == "local"

    def test_complete_todo_success(self, client, tmp_path):
        local_todos_file = str(tmp_path / "local_todos.json")
        with patch("app.config.settings.LOCAL_TODOS_FILE", local_todos_file), \
             patch("app.services.local_todos.settings.LOCAL_TODOS_FILE", local_todos_file):
            create_resp = client.post("/api/todos", json={"title": "Test todo"})
            assert create_resp.status_code == 200
            todo_id = create_resp.json()["id"]
            resp = client.patch(f"/api/todos/{todo_id}/complete")
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"
        assert resp.json()["todo_id"] == todo_id

    def test_complete_todo_not_found(self, client):
        with patch("app.api.routes.complete_local_todo", return_value=False):
            resp = client.patch("/api/todos/nonexistent-id/complete")
        assert resp.status_code == 404


class TestAIRoutes:
    def test_get_ai_config(self, client):
        from app.models.schemas import AIConfig

        fake_cfg = AIConfig(provider="openai", model="gpt-4o-mini", configured=True)
        with patch("app.api.routes.get_ai_config", return_value=fake_cfg):
            resp = client.get("/api/ai/config")
        assert resp.status_code == 200
        data = resp.json()
        assert data["provider"] == "openai"
        assert data["model"] == "gpt-4o-mini"
        assert data["configured"] is True

    def test_list_ai_models_returns_list(self, client):
        from app.models.schemas import AIModelInfo

        fake_models = [
            AIModelInfo(id="gpt-4o", name="GPT-4o", provider="github"),
            AIModelInfo(id="gpt-4o-mini", name="GPT-4o mini", provider="github"),
        ]
        with patch("app.api.routes.list_models", return_value=fake_models):
            resp = client.get("/api/ai/models")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["id"] == "gpt-4o"

    def test_list_ai_models_empty_for_openai(self, client):
        with patch("app.api.routes.list_models", return_value=[]):
            resp = client.get("/api/ai/models")
        assert resp.status_code == 200
        assert resp.json() == []


class TestVoiceRoute:
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
        with patch(
            "app.api.voice.settings.VOICE_WEBHOOK_SECRET", "test-secret"
        ), patch("app.api.voice.add_apple_event", return_value=True):
            payload = {
                "secret": "test-secret",
                "command": "add_event",
                "title": "Doctor appointment",
                "start": "2024-06-01T10:00:00+02:00",
            }
            resp = client.post("/api/voice/command", json=payload)
        assert resp.status_code == 200
        assert resp.json()["source"] == "apple"

    def test_add_event_missing_start(self, client):
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "test-secret"):
            payload = {
                "secret": "test-secret",
                "command": "add_event",
                "title": "No time event",
            }
            resp = client.post("/api/voice/command", json=payload)
        assert resp.status_code == 400

    def test_add_todo_success(self, client):
        from app.models.schemas import TodoItem
        fake_todo = TodoItem(id="todo-1", title="Buy milk", completed=False, source="local")
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "test-secret"), \
             patch("app.api.voice.add_local_todo", return_value=fake_todo):
            payload = {
                "secret": "test-secret",
                "command": "add_todo",
                "title": "Buy milk",
            }
            resp = client.post("/api/voice/command", json=payload)
        assert resp.status_code == 200
        assert resp.json()["status"] == "created"
        assert resp.json()["todo"]["title"] == "Buy milk"

    def test_unknown_command(self, client):
        with patch("app.api.voice.settings.VOICE_WEBHOOK_SECRET", "test-secret"):
            payload = {
                "secret": "test-secret",
                "command": "unknown_cmd",
                "title": "Whatever",
            }
            resp = client.post("/api/voice/command", json=payload)
        assert resp.status_code == 400
