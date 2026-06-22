"""Tests for the database-backed storage services."""
from datetime import datetime, timedelta, timezone


class TestLocalCalendar:
    def test_add_fetch_update_delete_roundtrip(self):
        from app.services.local_calendar import (
            add_local_event, delete_local_event, fetch_local_events, update_local_event,
        )
        now = datetime.now(timezone.utc).replace(microsecond=0)
        ev = add_local_event(
            title="Dentist",
            start=now + timedelta(hours=1),
            end=now + timedelta(hours=2),
            location="Downtown",
            assigned_to="Alex",
        )
        fetched = fetch_local_events(date=now)
        assert any(e.id == ev.id and e.title == "Dentist" for e in fetched)
        assert fetch_local_events(date=now, assigned_to="Alex")
        assert fetch_local_events(date=now, assigned_to="Nobody") == []

        updated = update_local_event(ev.id, title="Dentist (moved)")
        assert updated is not None and updated.title == "Dentist (moved)"

        assert delete_local_event(ev.id) is True
        assert delete_local_event(ev.id) is False


class TestLocalTodos:
    def test_complete_non_recurring(self):
        from app.services.local_todos import add_local_todo, complete_local_todo, fetch_local_todos
        todo = add_local_todo("Buy milk")
        assert complete_local_todo(todo.id) is True
        assert all(t.id != todo.id for t in fetch_local_todos())
        assert complete_local_todo("missing") is False

    def test_complete_recurring_creates_next_instance(self):
        from app.services.local_todos import add_local_todo, complete_local_todo, fetch_local_todos
        due = datetime.now(timezone.utc) + timedelta(days=1)
        todo = add_local_todo("Water plants", due=due, recurrence="daily")
        complete_local_todo(todo.id)
        open_todos = fetch_local_todos()
        # The original is completed; a fresh recurring instance should exist.
        assert len(open_todos) == 1
        assert open_todos[0].id != todo.id
        assert open_todos[0].recurrence == "daily"
        assert open_todos[0].due is not None


class TestSettingsStore:
    def test_save_and_load_upsert(self):
        from app.services.settings_store import load_user_settings, save_user_settings
        save_user_settings({"WEATHER_CITY": "Munich"})
        assert load_user_settings()["WEATHER_CITY"] == "Munich"
        # Upsert: saving the same key again updates rather than duplicates.
        save_user_settings({"WEATHER_CITY": "Hamburg"})
        assert load_user_settings()["WEATHER_CITY"] == "Hamburg"

    def test_non_whitelisted_keys_ignored(self):
        from app.services.settings_store import load_user_settings, save_user_settings
        save_user_settings({"DATABASE_URL": "postgres://evil", "WEATHER_CITY": "Berlin"})
        loaded = load_user_settings()
        assert "DATABASE_URL" not in loaded
        assert loaded["WEATHER_CITY"] == "Berlin"

    def test_is_setup_complete(self):
        from app.services.settings_store import is_setup_complete, save_user_settings
        assert is_setup_complete() is False
        save_user_settings({"SETUP_COMPLETE": True})
        assert is_setup_complete() is True


class TestNotificationDedup:
    def test_mark_and_check(self):
        from app.services.notifications import _has_sent_today, _mark_sent_today
        assert _has_sent_today() is False
        _mark_sent_today()
        assert _has_sent_today() is True


class TestFamilyMembers:
    def test_roundtrip(self):
        from app.services.family_members import (
            add_family_member, delete_family_member, fetch_family_members, update_family_member,
        )
        m = add_family_member("Sam", age=8, notes=["likes dinos"])
        assert any(x.id == m.id for x in fetch_family_members())
        updated = update_family_member(m.id, name="Samantha", age=9, notes=["likes dinos", "soccer"])
        assert updated is not None and updated.name == "Samantha" and updated.age == 9
        assert delete_family_member(m.id) is True
        assert delete_family_member(m.id) is False
