"""Timezone helpers that make naive→aware conversion DST-safe.

``pytz``'s ``localize(naive_dt)`` raises during daylight-saving transitions:
non-existent wall-clock times (spring-forward gap) and ambiguous times
(fall-back overlap). Several call sites previously let that exception bubble
up or swallowed it. ``to_aware`` resolves both cases deterministically so a
calendar event or todo that happens to land on a transition can never crash
the pipeline.
"""
from datetime import datetime

import pytz


def to_aware(dt: datetime, tz: pytz.BaseTzInfo) -> datetime:
    """Return *dt* as a timezone-aware datetime in *tz*.

    Already-aware datetimes are returned unchanged. Naive datetimes are
    localized; DST gaps/overlaps fall back to standard time (``is_dst=False``)
    instead of raising.
    """
    if dt.tzinfo is not None:
        return dt
    try:
        return tz.localize(dt, is_dst=None)
    except (pytz.exceptions.NonExistentTimeError, pytz.exceptions.AmbiguousTimeError):
        return tz.localize(dt, is_dst=False)
