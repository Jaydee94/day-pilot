"""
Birthday detection service for DayPilot.

Scans calendar events from all configured sources (iCal feeds, CalDAV, local)
over a look-ahead window and identifies which events are birthdays.

Detection strategy (in order):
  1. Keyword matching – cheap, instant, no AI quota used.
  2. AI classification – only for events that don't match any keyword; results
     are cached permanently in memory so that each event title is only
     classified once per server lifetime.

The returned Birthday objects include the person's name (extracted from the
event title) and the event date.  An ``age`` is only populated when a year of
birth can be parsed from the event description or title.
"""
import hashlib
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import pytz

from app.config import settings
from app.models.schemas import Birthday, CalendarEvent

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Keyword matching
# ---------------------------------------------------------------------------

# Birthday-related text keywords (English and German) – checked in both title and description.
_BIRTHDAY_TEXT_KEYWORDS = [
    "birthday",
    "geburtstag",
    "bday",
    "b-day",
    "b'day",
]

# Emoji keywords that are unambiguously birthday-related – checked in title only.
# 🎉 is intentionally excluded: it is too generic and matches any celebration event.
_BIRTHDAY_EMOJI_KEYWORDS = [
    "🎂",
]

# Patterns used to strip the keyword from the title to obtain the person's name.
_NAME_STRIP_PATTERNS = [
    # "John's Birthday" / "John's Geburtstag"
    re.compile(r"['']s?\s+(?:birthday|geburtstag|bday)\b", re.IGNORECASE),
    # "Birthday of John" / "Geburtstag von John"
    re.compile(r"^(?:birthday|geburtstag|bday)\s+(?:of|von|:)\s*", re.IGNORECASE),
    # "John Birthday" (keyword at end)
    re.compile(r"\s+(?:birthday|geburtstag|bday|b-day)\s*$", re.IGNORECASE),
    # "Birthday: John" (keyword at start with colon)
    re.compile(r"^(?:birthday|geburtstag|bday)\s*:\s*", re.IGNORECASE),
    # Emoji
    re.compile(r"[🎂]", re.IGNORECASE),
]

# Patterns for extracting ordinal age from titles like "John's 30th Birthday".
_AGE_FROM_TITLE_RE = re.compile(
    r"\b(\d{1,3})(?:st|nd|rd|th)?\s+(?:birthday|geburtstag|bday)\b",
    re.IGNORECASE,
)

# Maximum number of characters from the event description sent to the AI prompt.
_AI_PROMPT_MAX_DESCRIPTION_LENGTH = 200


def _matches_keyword(title: str, description: Optional[str] = None) -> bool:
    """Return True if the event title (or description) contains a birthday keyword.

    Text keywords (birthday, geburtstag, …) are checked in both the title and
    description.  Emoji keywords (🎂) are only checked in the title to avoid
    false positives from celebration or party event descriptions.
    """
    title_lower = title.lower()
    if any(kw in title_lower for kw in _BIRTHDAY_TEXT_KEYWORDS):
        return True
    if any(kw in title for kw in _BIRTHDAY_EMOJI_KEYWORDS):
        return True
    if description:
        desc_lower = description.lower()
        if any(kw in desc_lower for kw in _BIRTHDAY_TEXT_KEYWORDS):
            return True
    return False


def _extract_name(title: str) -> str:
    """Strip birthday keywords/patterns from an event title to get the person's name."""
    name = title
    for pattern in _NAME_STRIP_PATTERNS:
        name = pattern.sub("", name)
    return name.strip(" ,-:") or title.strip()


def _extract_age_from_title(title: str) -> Optional[int]:
    """Try to extract an ordinal age like '30th' from the event title."""
    m = _AGE_FROM_TITLE_RE.search(title)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None


# ---------------------------------------------------------------------------
# AI-based detection cache
# ---------------------------------------------------------------------------

# Cache keyed by a hash of the event title + description.
# Stored as {hash: True/False} – True = is a birthday event.
_ai_classification_cache: Dict[str, bool] = {}


def _cache_key_for_event(title: str, description: Optional[str]) -> str:
    raw = (title + "|" + (description or "")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _classify_with_ai(title: str, description: Optional[str]) -> Optional[bool]:
    """
    Ask the configured AI provider whether an event is a birthday event.

    Returns True / False, or None when the AI is not configured / unavailable.
    Results are stored in ``_ai_classification_cache``.
    """
    cache_key = _cache_key_for_event(title, description)
    if cache_key in _ai_classification_cache:
        return _ai_classification_cache[cache_key]

    # Avoid importing at module level to keep the service lightweight when AI
    # is not configured.
    try:
        from openai import OpenAI  # type: ignore[import]
    except ImportError:
        return None

    # Check whether a credential is available.
    provider = settings.AI_PROVIDER
    api_key: Optional[str] = None
    base_url: Optional[str] = None

    if provider == "github":
        api_key = settings.GITHUB_TOKEN
        base_url = "https://models.inference.ai.azure.com"
    elif provider == "groq":
        api_key = settings.GROQ_API_KEY
        base_url = "https://api.groq.com/openai/v1"
    elif provider == "google":
        api_key = settings.GOOGLE_AI_API_KEY
        base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
    else:
        api_key = settings.OPENAI_API_KEY

    if not api_key:
        return None

    model = settings.AI_MODEL or {
        "openai": "gpt-4o-mini",
        "github": "gpt-4o-mini",
        "groq": "llama-3.3-70b-versatile",
        "google": "gemini-2.0-flash",
    }.get(provider, "gpt-4o-mini")

    try:
        client_kwargs: dict = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        client = OpenAI(**client_kwargs)

        desc_part = f"\nDescription: {description[:_AI_PROMPT_MAX_DESCRIPTION_LENGTH]}" if description else ""
        prompt = (
            "Answer ONLY with 'yes' or 'no'.\n"
            f"Is the following calendar event a birthday celebration for a person?\n"
            f"Title: {title}{desc_part}"
        )
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=5,
        )
        answer = response.choices[0].message.content.strip().lower()
        result = answer.startswith("yes")
        _ai_classification_cache[cache_key] = result
        logger.debug("AI classified '%s' as birthday=%s", title, result)
        return result
    except Exception as exc:
        logger.warning("AI birthday classification failed for '%s': %s", title, exc)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_upcoming_birthdays(days_ahead: int = 14) -> List[Birthday]:
    """
    Return birthday events occurring in the next *days_ahead* days.

    Events are fetched from all configured calendar sources.  Detection is
    performed first by keyword matching, then by AI classification (with
    permanent in-memory caching) for events that do not match any keyword.
    """
    from app.services.calendar_sync import (  # local import to avoid circular deps
        fetch_ical_events,
        fetch_apple_events,
    )
    from app.services.local_calendar import fetch_local_events

    tz = pytz.timezone(settings.APP_TIMEZONE)
    today = datetime.now(tz)

    birthdays: List[Birthday] = []
    seen_keys: set = set()

    for day_offset in range(days_ahead + 1):
        target_date = today + timedelta(days=day_offset)

        events: List[CalendarEvent] = []
        try:
            events.extend(fetch_ical_events(date=target_date))
        except Exception as exc:
            logger.warning("Could not fetch iCal events for birthday scan: %s", exc)
        try:
            events.extend(fetch_apple_events(date=target_date))
        except Exception as exc:
            logger.warning("Could not fetch Apple events for birthday scan: %s", exc)
        try:
            events.extend(fetch_local_events(date=target_date))
        except Exception as exc:
            logger.warning("Could not fetch local events for birthday scan: %s", exc)

        for ev in events:
            is_birthday = False

            if _matches_keyword(ev.title, ev.description):
                is_birthday = True
            else:
                # Only ask AI for events we haven't already decided on.
                ai_result = _classify_with_ai(ev.title, ev.description)
                if ai_result is True:
                    is_birthday = True

            if not is_birthday:
                continue

            name = _extract_name(ev.title)
            age = _extract_age_from_title(ev.title)
            event_date = ev.start

            # Deduplicate: same person + same date should only appear once.
            dedup_key = (name.lower(), event_date.date())
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            birthdays.append(
                Birthday(name=name, date=event_date, age=age)
            )

    # Sort by date, then name.
    birthdays.sort(key=lambda b: (b.date, b.name))
    return birthdays


def invalidate_ai_birthday_cache() -> None:
    """Clear all cached AI birthday classification results."""
    _ai_classification_cache.clear()
