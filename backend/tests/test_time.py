"""Tests for the DST-safe naive->aware datetime helper."""
from datetime import datetime

import pytz

from app.services._time import to_aware


TZ = pytz.timezone("Europe/Berlin")


def test_already_aware_returned_unchanged():
    aware = TZ.localize(datetime(2024, 1, 1, 12, 0))
    assert to_aware(aware, TZ) is aware


def test_normal_naive_time_localized():
    result = to_aware(datetime(2024, 1, 1, 12, 0), TZ)
    assert result.tzinfo is not None
    assert result.hour == 12


def test_spring_forward_gap_does_not_raise():
    # 2024-03-31 02:30 does not exist in Europe/Berlin (clocks jump 02:00 -> 03:00).
    result = to_aware(datetime(2024, 3, 31, 2, 30), TZ)
    assert result.tzinfo is not None


def test_fall_back_overlap_does_not_raise():
    # 2024-10-27 02:30 is ambiguous in Europe/Berlin (clocks fall 03:00 -> 02:00).
    result = to_aware(datetime(2024, 10, 27, 2, 30), TZ)
    assert result.tzinfo is not None
