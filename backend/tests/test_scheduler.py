"""Tests for scheduler time parsing and config-level time/timezone validation."""
import pytest
from pydantic import ValidationError

from app.config import Settings
from app.services import scheduler


# ---------------------------------------------------------------------------
# Config validation (fail-fast on construction / assignment)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("value", ["07:00", "0:00", "23:59", "9:05", "00:00"])
def test_valid_daily_summary_time_accepted(value):
    s = Settings(DAILY_SUMMARY_TIME=value)
    assert s.DAILY_SUMMARY_TIME == value


@pytest.mark.parametrize("value", ["7", "07.00", "25:00", "12:60", "0700", "", "ab:cd", "07:00:00"])
def test_invalid_daily_summary_time_rejected(value):
    with pytest.raises(ValidationError):
        Settings(DAILY_SUMMARY_TIME=value)


def test_invalid_timezone_rejected():
    with pytest.raises(ValidationError):
        Settings(APP_TIMEZONE="Not/AZone")


def test_valid_timezone_accepted():
    assert Settings(APP_TIMEZONE="America/New_York").APP_TIMEZONE == "America/New_York"


def test_assignment_revalidates_time():
    s = Settings()
    with pytest.raises(ValidationError):
        s.DAILY_SUMMARY_TIME = "99:99"


# ---------------------------------------------------------------------------
# Scheduler defensive parsing (fallback when the overlay slips a bad value in)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "raw,expected",
    [("07:00", (7, 0)), ("23:59", (23, 59)), ("9:05", (9, 5)), ("00:00", (0, 0))],
)
def test_parse_summary_time_valid(monkeypatch, raw, expected):
    monkeypatch.setattr(scheduler.settings, "DAILY_SUMMARY_TIME", raw)
    assert scheduler._parse_summary_time() == expected


@pytest.mark.parametrize("raw", ["7", "07.00", "25:00", "12:60", "", "garbage", None])
def test_parse_summary_time_falls_back(monkeypatch, raw):
    # Bypass validation by setting the attribute on the module-level settings object
    # directly (object.__setattr__ skips pydantic's validate_assignment).
    object.__setattr__(scheduler.settings, "DAILY_SUMMARY_TIME", raw)
    assert scheduler._parse_summary_time() == scheduler._DEFAULT_SUMMARY_TIME
