"""Unit tests for calendar-based birthday detection."""
from datetime import datetime, timedelta
from unittest.mock import patch

import pytz

from app.models.schemas import CalendarEvent
from app.services.birthday_detection import (
    _extract_age_from_title,
    _extract_name,
    _is_birthday_calendar,
    get_upcoming_birthdays,
    invalidate_birthday_cache,
    refresh_upcoming_birthdays_cache,
)


BERLIN_TZ = pytz.timezone("Europe/Berlin")


def _event(
    *,
    eid: str,
    title: str,
    day_offset: int,
    calendar_name: str,
    source: str = "ical",
) -> CalendarEvent:
    base = datetime.now(BERLIN_TZ).replace(hour=10, minute=0, second=0, microsecond=0)
    start = base + timedelta(days=day_offset)
    return CalendarEvent(
        id=eid,
        title=title,
        start=start,
        end=start + timedelta(hours=1),
        source=source,
        calendar_name=calendar_name,
    )


class TestExtractName:
    def test_possessive_birthday(self):
        assert _extract_name("John's Birthday") == "John"

    def test_geburtstag_von(self):
        assert _extract_name("Geburtstag von Peter") == "Peter"

    def test_no_keyword_returns_title(self):
        assert _extract_name("Some Event") == "Some Event"


class TestExtractAgeFromTitle:
    def test_ordinal_30th(self):
        assert _extract_age_from_title("John's 30th Birthday") == 30

    def test_no_age_returns_none(self):
        assert _extract_age_from_title("John's Birthday") is None


class TestIsBirthdayCalendar:
    def test_case_insensitive_match(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = "Bdays,Birthdays"
            assert _is_birthday_calendar("bdays") is True
            assert _is_birthday_calendar("BDAYS") is True

    def test_non_matching_calendar(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = "Bdays,Birthdays"
            assert _is_birthday_calendar("Work") is False

    def test_birthday_sentinel_is_always_true(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = ""
            assert _is_birthday_calendar("__birthday__") is True


class TestUpcomingBirthdays:
    def setup_method(self):
        invalidate_birthday_cache()

    def teardown_method(self):
        invalidate_birthday_cache()

    def test_only_events_from_birthday_calendars_are_returned(self):
        events = [
            _event(eid="1", title="John's Birthday", day_offset=1, calendar_name="Birthdays"),
            _event(eid="2", title="Team Meeting", day_offset=2, calendar_name="Work"),
            _event(eid="3", title="🎂 Anna", day_offset=3, calendar_name="__birthday__"),
        ]
        with patch(
            "app.services.calendar_sync.fetch_ical_events_in_range",
            return_value=events,
        ), patch(
            "app.services.calendar_sync.fetch_apple_events_in_range",
            return_value=[],
        ), patch(
            "app.services.birthday_detection.settings.BIRTHDAY_CALENDAR_NAMES",
            "Birthdays,Geburtstage",
        ):
            result = get_upcoming_birthdays(days_ahead=366, limit=5)

        assert len(result) == 2
        assert result[0].name == "John"
        assert result[1].name == "Anna"

    def test_returns_next_five_sorted_by_date(self):
        events = [
            _event(eid="1", title="A Birthday", day_offset=20, calendar_name="Birthdays"),
            _event(eid="2", title="B Birthday", day_offset=5, calendar_name="Birthdays"),
            _event(eid="3", title="C Birthday", day_offset=8, calendar_name="Birthdays"),
            _event(eid="4", title="D Birthday", day_offset=2, calendar_name="Birthdays"),
            _event(eid="5", title="E Birthday", day_offset=12, calendar_name="Birthdays"),
            _event(eid="6", title="F Birthday", day_offset=3, calendar_name="Birthdays"),
        ]
        with patch(
            "app.services.calendar_sync.fetch_ical_events_in_range",
            return_value=events,
        ), patch(
            "app.services.calendar_sync.fetch_apple_events_in_range",
            return_value=[],
        ), patch(
            "app.services.birthday_detection.settings.BIRTHDAY_CALENDAR_NAMES",
            "Birthdays",
        ):
            result = get_upcoming_birthdays(days_ahead=366, limit=5)

        assert len(result) == 5
        assert [b.name for b in result] == ["D", "F", "B", "C", "E"]

    def test_cache_is_used_after_refresh(self):
        events = [
            _event(eid="1", title="John's Birthday", day_offset=1, calendar_name="Birthdays"),
        ]
        with patch(
            "app.services.calendar_sync.fetch_ical_events_in_range",
            return_value=events,
        ) as mock_ical, patch(
            "app.services.calendar_sync.fetch_apple_events_in_range",
            return_value=[],
        ), patch(
            "app.services.birthday_detection.settings.BIRTHDAY_CALENDAR_NAMES",
            "Birthdays",
        ):
            refresh_upcoming_birthdays_cache(days_ahead=366, limit=5)
            result = get_upcoming_birthdays(days_ahead=366, limit=5)

        assert len(result) == 1
        assert result[0].name == "John"
        assert mock_ical.call_count == 1
