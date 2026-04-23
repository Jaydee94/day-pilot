"""Unit tests for birthday detection keyword matching and name extraction."""
import pytest
from unittest.mock import patch

from app.services.birthday_detection import (
    _matches_keyword,
    _extract_name,
    _extract_age_from_title,
    _is_birthday_calendar,
)


# ---------------------------------------------------------------------------
# _matches_keyword
# ---------------------------------------------------------------------------

class TestMatchesKeyword:
    """Keyword matching should detect common birthday title patterns."""

    # ── True positives ──────────────────────────────────────────────────────

    def test_birthday_in_title(self):
        assert _matches_keyword("John's Birthday") is True

    def test_geburtstag_in_title(self):
        assert _matches_keyword("Geburtstag von Anna") is True

    def test_bday_in_title(self):
        assert _matches_keyword("Sarah bday") is True

    def test_b_dash_day_in_title(self):
        assert _matches_keyword("Mike b-day") is True

    def test_cake_emoji_in_title(self):
        assert _matches_keyword("🎂 Peter") is True

    def test_birthday_case_insensitive(self):
        assert _matches_keyword("BIRTHDAY PARTY FOR ALICE") is True

    def test_geburtstag_case_insensitive(self):
        assert _matches_keyword("GEBURTSTAG Hans") is True

    def test_birthday_in_description_only(self):
        assert _matches_keyword("Family Dinner", "Celebrating her birthday!") is True

    def test_geburtstag_in_description(self):
        assert _matches_keyword("Familienfest", "Wir feiern seinen Geburtstag.") is True

    # ── False positives that must NOT match ─────────────────────────────────

    def test_party_emoji_in_title_not_birthday(self):
        """🎉 alone in the title must not be treated as a birthday."""
        assert _matches_keyword("🎉 Q1 Kick-Off") is False

    def test_party_emoji_in_description_not_birthday(self):
        """🎉 in the description must not trigger a match."""
        assert _matches_keyword("Team Meeting", "Great results! 🎉") is False

    def test_unrelated_event(self):
        assert _matches_keyword("Sprint Planning") is False

    def test_celebration_without_keyword(self):
        assert _matches_keyword("Anniversary Dinner", "Celebrating 10 years together.") is False

    def test_emoji_only_in_description_not_birthday(self):
        assert _matches_keyword("Office Party", "🎂-shaped cake available") is False

    def test_cake_emoji_only_in_description(self):
        """🎂 is only matched in the title, not the description."""
        assert _matches_keyword("Office Lunch", "We'll have a 🎂 cake") is False


# ---------------------------------------------------------------------------
# _extract_name
# ---------------------------------------------------------------------------

class TestExtractName:

    def test_possessive_birthday(self):
        assert _extract_name("John's Birthday") == "John"

    def test_birthday_of_pattern(self):
        assert _extract_name("Birthday of Jane") == "Jane"

    def test_keyword_at_end(self):
        assert _extract_name("Sarah Birthday") == "Sarah"

    def test_keyword_at_start_with_colon(self):
        assert _extract_name("Birthday: Alice") == "Alice"

    def test_geburtstag_von(self):
        assert _extract_name("Geburtstag von Peter") == "Peter"

    def test_cake_emoji_stripped(self):
        assert _extract_name("🎂 Max") == "Max"

    def test_no_keyword_returns_title(self):
        assert _extract_name("Some Event") == "Some Event"


# ---------------------------------------------------------------------------
# _extract_age_from_title
# ---------------------------------------------------------------------------

class TestExtractAgeFromTitle:

    def test_ordinal_30th(self):
        assert _extract_age_from_title("John's 30th Birthday") == 30

    def test_ordinal_1st(self):
        assert _extract_age_from_title("Baby's 1st Birthday") == 1

    def test_ordinal_2nd(self):
        assert _extract_age_from_title("Emma's 2nd Birthday") == 2

    def test_ordinal_no_suffix(self):
        assert _extract_age_from_title("Lisa 40 Birthday") == 40

    def test_no_age_returns_none(self):
        assert _extract_age_from_title("John's Birthday") is None


# ---------------------------------------------------------------------------
# _is_birthday_calendar
# ---------------------------------------------------------------------------

class TestIsBirthdayCalendar:
    """Calendar-name matching should be case-insensitive and respect the setting."""

    def test_exact_match(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = "Bdays,Birthdays"
            assert _is_birthday_calendar("Bdays") is True

    def test_case_insensitive_match(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = "Bdays,Birthdays"
            assert _is_birthday_calendar("bdays") is True
            assert _is_birthday_calendar("BDAYS") is True
            assert _is_birthday_calendar("Birthdays") is True

    def test_whitespace_trimmed(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = " Bdays , Geburtstage "
            assert _is_birthday_calendar("Bdays") is True
            assert _is_birthday_calendar("Geburtstage") is True

    def test_non_matching_calendar(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = "Bdays,Birthdays"
            assert _is_birthday_calendar("Work") is False
            assert _is_birthday_calendar("Family") is False

    def test_none_calendar_name_returns_false(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = "Bdays"
            assert _is_birthday_calendar(None) is False

    def test_empty_calendar_name_returns_false(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = "Bdays"
            assert _is_birthday_calendar("") is False

    def test_empty_setting_returns_false(self):
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = ""
            assert _is_birthday_calendar("Bdays") is False

    def test_contacts_calendar_default(self):
        """'Contacts' is in the default list – Google Contacts birthdays use this name."""
        with patch("app.services.birthday_detection.settings") as mock_settings:
            mock_settings.BIRTHDAY_CALENDAR_NAMES = "Bdays,Birthdays,Geburtstage,Contacts"
            assert _is_birthday_calendar("Contacts") is True
