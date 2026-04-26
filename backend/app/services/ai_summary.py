"""
AI summary service supporting multiple providers, all via the OpenAI-compatible SDK.

Provider selection is controlled by the ``AI_PROVIDER`` environment variable:
- ``openai``  (default) — requires ``OPENAI_API_KEY``
- ``github``            — requires ``GITHUB_TOKEN`` (GitHub PAT with ``models:read`` scope)
- ``groq``             — requires ``GROQ_API_KEY`` (free tier at console.groq.com)
- ``google``           — requires ``GOOGLE_AI_API_KEY`` (free tier at aistudio.google.com)

The model to use is read from ``AI_MODEL``.  When ``AI_MODEL`` is empty the
service falls back to the provider-specific default defined in ``_PROVIDER_DEFAULTS``.
"""
import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore[assignment,misc]

from app.config import settings
from app.models.schemas import DailySummary, AIConfig, AIModelInfo, TimeBlock

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Daily AI summary cache
# ---------------------------------------------------------------------------
# Keyed by ISO date string (YYYY-MM-DD). Stores the generated ai_summary text
# and top_priorities so that repeated calls to /api/summary on the same day
# never trigger a second AI API request.
#
# The cache is intentionally in-memory; it is cleared either when the process
# restarts or when the scheduler's daily pipeline explicitly invalidates it
# before generating the fresh morning briefing.
# ---------------------------------------------------------------------------
_ai_summary_cache: Dict[str, Dict[str, Any]] = {}


def invalidate_ai_cache(date_key: Optional[str] = None) -> None:
    """Remove cached AI result for *date_key* (or all keys when None)."""
    if date_key is None:
        _ai_summary_cache.clear()
    else:
        _ai_summary_cache.pop(date_key, None)


def _cache_key(summary_date) -> str:
    """Return the cache key for the given date."""
    try:
        return summary_date.strftime("%Y-%m-%d")
    except AttributeError:
        return str(summary_date)[:10]

# Provider base URLs (all OpenAI-compatible)
_GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com"
_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

# Default model per provider when AI_MODEL is not configured
_PROVIDER_DEFAULTS = {
    "openai": "gpt-4o-mini",
    "github": "gpt-4o-mini",
    "groq": "llama-3.3-70b-versatile",
    "google": "gemini-2.0-flash",
}

# Well-known models available through the GitHub Models marketplace.
# This list is used when the models endpoint is unavailable.
_GITHUB_KNOWN_MODELS: List[AIModelInfo] = [
    AIModelInfo(id="gpt-4o", name="GPT-4o", provider="github"),
    AIModelInfo(id="gpt-4o-mini", name="GPT-4o mini", provider="github"),
    AIModelInfo(id="o1", name="o1", provider="github"),
    AIModelInfo(id="o1-mini", name="o1-mini", provider="github"),
    AIModelInfo(id="o3", name="o3", provider="github"),
    AIModelInfo(id="o3-mini", name="o3-mini", provider="github"),
    AIModelInfo(
        id="Meta-Llama-3.1-70B-Instruct",
        name="Meta Llama 3.1 70B Instruct",
        provider="github",
    ),
    AIModelInfo(
        id="Meta-Llama-3.1-405B-Instruct",
        name="Meta Llama 3.1 405B Instruct",
        provider="github",
    ),
    AIModelInfo(
        id="Mistral-large-2407",
        name="Mistral Large (2407)",
        provider="github",
    ),
    AIModelInfo(
        id="Mistral-small",
        name="Mistral Small",
        provider="github",
    ),
    AIModelInfo(
        id="Phi-3.5-MoE-instruct",
        name="Phi 3.5 MoE Instruct",
        provider="github",
    ),
    AIModelInfo(
        id="Phi-3.5-mini-instruct",
        name="Phi 3.5 Mini Instruct",
        provider="github",
    ),
]

_GROQ_KNOWN_MODELS: List[AIModelInfo] = [
    AIModelInfo(id="llama-3.3-70b-versatile", name="Llama 3.3 70B (free)", provider="groq"),
    AIModelInfo(id="llama-3.1-8b-instant", name="Llama 3.1 8B Instant (free)", provider="groq"),
    AIModelInfo(id="llama-3.2-11b-vision-preview", name="Llama 3.2 11B Vision (free)", provider="groq"),
    AIModelInfo(id="mixtral-8x7b-32768", name="Mixtral 8x7B (free)", provider="groq"),
    AIModelInfo(id="gemma2-9b-it", name="Gemma 2 9B (free)", provider="groq"),
]

_GOOGLE_KNOWN_MODELS: List[AIModelInfo] = [
    AIModelInfo(id="gemini-2.0-flash", name="Gemini 2.0 Flash (free)", provider="google"),
    AIModelInfo(id="gemini-2.0-flash-lite", name="Gemini 2.0 Flash Lite (free)", provider="google"),
    AIModelInfo(id="gemini-1.5-flash", name="Gemini 1.5 Flash (free)", provider="google"),
    AIModelInfo(id="gemini-1.5-flash-8b", name="Gemini 1.5 Flash-8B (free)", provider="google"),
    AIModelInfo(id="gemini-1.5-pro", name="Gemini 1.5 Pro", provider="google"),
]


def _parse_time_blocks(text: str) -> List[TimeBlock]:
    """Extract and parse the TIME_BLOCKS JSON section from an AI response.

    Looks for a JSON array either inside a ```json ... ``` code fence or
    raw after the 'TIME_BLOCKS:' marker.  Returns an empty list when nothing
    is found or the JSON is malformed.
    """
    # Isolate the part after TIME_BLOCKS:
    marker = "TIME_BLOCKS:"
    if marker not in text:
        return []
    after = text.split(marker, 1)[1]

    # Prefer a fenced code block  (```json … ```)
    fenced = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", after, re.DOTALL)
    if fenced:
        raw = fenced.group(1)
    else:
        # Fall back to the first bare JSON array
        bare = re.search(r"(\[.*?\])", after, re.DOTALL)
        if not bare:
            return []
        raw = bare.group(1)

    try:
        data = json.loads(raw)
        if not isinstance(data, list):
            return []
        blocks: List[TimeBlock] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            try:
                blocks.append(TimeBlock(**item))
            except Exception:
                continue
        return blocks
    except Exception as exc:
        logger.warning("Failed to parse TIME_BLOCKS JSON: %s", exc)
        return []


def _build_family_context() -> str:
    """Return a formatted string of family member profiles for the AI prompt."""
    try:
        from app.services.family_members import fetch_family_members
        members = fetch_family_members()
        if not members:
            return ""
        lines = []
        for m in members:
            age_str = f", {m.age} Jahre" if m.age is not None else ""
            line = f"- {m.name}{age_str}"
            if m.notes:
                line += ": " + "; ".join(m.notes)
            lines.append(line)
        return "\n".join(lines)
    except Exception:
        return ""


def _resolve_model() -> str:
    """Return the model name to use, respecting AI_MODEL > legacy OPENAI_MODEL > provider default."""
    if settings.AI_MODEL:
        return settings.AI_MODEL
    if settings.AI_PROVIDER == "openai" and settings.OPENAI_MODEL:
        return settings.OPENAI_MODEL
    return _PROVIDER_DEFAULTS.get(settings.AI_PROVIDER, "gpt-4o-mini")


def _get_client() -> "OpenAI":  # type: ignore[name-defined]
    """Build the OpenAI-compatible client for the configured provider."""
    if settings.AI_PROVIDER == "github":
        return OpenAI(
            base_url=_GITHUB_MODELS_BASE_URL,
            api_key=settings.GITHUB_TOKEN,
        )
    if settings.AI_PROVIDER == "groq":
        return OpenAI(
            base_url=_GROQ_BASE_URL,
            api_key=settings.GROQ_API_KEY,
        )
    if settings.AI_PROVIDER == "google":
        return OpenAI(
            base_url=_GOOGLE_BASE_URL,
            api_key=settings.GOOGLE_AI_API_KEY,
        )
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def _is_configured() -> bool:
    """Return True when the required credential for the active provider is set."""
    if settings.AI_PROVIDER == "github":
        return bool(settings.GITHUB_TOKEN)
    if settings.AI_PROVIDER == "groq":
        return bool(settings.GROQ_API_KEY)
    if settings.AI_PROVIDER == "google":
        return bool(settings.GOOGLE_AI_API_KEY)
    return bool(settings.OPENAI_API_KEY)


def get_ai_config() -> AIConfig:
    """Return the current AI provider configuration."""
    return AIConfig(
        provider=settings.AI_PROVIDER,
        model=_resolve_model(),
        configured=_is_configured(),
    )


def list_models() -> List[AIModelInfo]:
    """
    Return models available for the configured provider.

    For the GitHub provider the list is fetched live from the models endpoint;
    if that call fails the built-in fallback list is returned instead.
    For Groq and Google the built-in curated lists are returned directly.
    For OpenAI an empty list is returned (users set the model via AI_MODEL).
    """
    provider = settings.AI_PROVIDER

    if provider == "groq":
        return _GROQ_KNOWN_MODELS if settings.GROQ_API_KEY else []

    if provider == "google":
        return _GOOGLE_KNOWN_MODELS if settings.GOOGLE_AI_API_KEY else []

    if provider != "github" or not settings.GITHUB_TOKEN:
        return []

    if OpenAI is None:
        return _GITHUB_KNOWN_MODELS

    try:
        client = _get_client()
        raw_models = client.models.list()
        return [
            AIModelInfo(id=m.id, name=m.id, provider="github")
            for m in raw_models.data
        ]
    except Exception as exc:
        logger.warning("Could not fetch GitHub Models list (%s) — using built-in list", exc)
        return _GITHUB_KNOWN_MODELS


def _build_prompt(summary: DailySummary) -> str:
    lang = settings.APP_LANGUAGE if settings.APP_LANGUAGE in {"en", "de"} else "en"
    is_de = lang == "de"

    import pytz as _pytz
    local_tz = _pytz.timezone(settings.APP_TIMEZONE)
    local_date = summary.date.astimezone(local_tz)
    is_weekend = local_date.weekday() >= 5

    def _weather_cautions() -> List[str]:
        if not summary.weather:
            return []
        w = summary.weather
        cautions: List[str] = []
        desc = (w.description or "").lower()

        rain_chances = [h.chance_of_rain for h in (w.hourly_forecast or [])]
        max_rain = max(rain_chances) if rain_chances else 0

        if max_rain >= 60 or any(k in desc for k in ["rain", "shower", "storm", "regen", "gewitter"]):
            cautions.append(
                "Regenschutz mitnehmen und Outdoor-Plan flexibel halten"
                if is_de
                else "Bring rain gear and keep outdoor plans flexible"
            )

        if w.wind_speed >= 10:
            cautions.append(
                "Wind beachten: draussen waermere Schichten einplanen"
                if is_de
                else "Expect wind: plan warmer outdoor layers"
            )

        if w.temperature >= 28:
            cautions.append(
                "Ausreichend trinken und direkte Mittagssonne vermeiden"
                if is_de
                else "Stay hydrated and avoid direct midday sun"
            )

        if w.temperature <= 3:
            cautions.append(
                "Warme Kleidung und mehr Zeit fuer Wege einplanen"
                if is_de
                else "Wear warm clothing and allow extra travel time"
            )

        return cautions[:2]

    def _recommended_time_windows() -> List[str]:
        if not summary.events:
            return []

        day_start = local_date.replace(hour=8, minute=0, second=0, microsecond=0)
        day_end = local_date.replace(hour=20, minute=0, second=0, microsecond=0)

        busy: List[tuple[datetime, datetime]] = []
        for ev in summary.events:
            start = ev.start.astimezone(local_tz)
            end = ev.end.astimezone(local_tz)
            if end <= day_start or start >= day_end:
                continue
            busy.append((max(start, day_start), min(end, day_end)))

        if not busy:
            if is_de:
                return ["08:00-10:00 fuer wichtige Aufgabe", "17:00-18:00 fuer Familienorga"]
            return ["08:00-10:00 for a focused task", "17:00-18:00 for family planning"]

        busy.sort(key=lambda x: x[0])
        merged: List[tuple[datetime, datetime]] = []
        for start, end in busy:
            if not merged or start > merged[-1][1]:
                merged.append((start, end))
            else:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))

        free: List[tuple[datetime, datetime]] = []
        cursor = day_start
        for start, end in merged:
            if start > cursor:
                free.append((cursor, start))
            cursor = max(cursor, end)
        if cursor < day_end:
            free.append((cursor, day_end))

        candidates = []
        for start, end in free:
            duration = (end - start).total_seconds() / 60
            if duration >= 30:
                candidates.append((start, end, duration))

        # Prefer the longest free windows; tie-break by earlier time.
        candidates.sort(key=lambda x: (-x[2], x[0]))
        top = candidates[:2]

        windows: List[str] = []
        for start, end, duration in top:
            slot = f"{start.strftime('%H:%M')}-{end.strftime('%H:%M')}"
            if is_de:
                label = "fuer Fokusaufgabe" if duration >= 90 else "fuer kurze Erledigungen"
            else:
                label = "for focused work" if duration >= 90 else "for quick errands"
            windows.append(f"{slot} {label}")
        return windows

    lines: List[str] = [
        (
            f"Datum: {summary.date.strftime('%A, %B %d, %Y')}"
            if is_de
            else f"Date: {summary.date.strftime('%A, %B %d, %Y')}"
        ),
        (
            "Kontext: Familie mit Kleinkind (3 Jahre)"
            if is_de
            else "Context: Family with a 3-year-old toddler"
        ),
        (
            "Tagesart: Wochenende"
            if is_de and is_weekend
            else (
                "Tagesart: Werktag"
                if is_de
                else ("Day type: Weekend" if is_weekend else "Day type: Weekday")
            )
        ),
        "",
    ]

    if summary.weather:
        w = summary.weather
        unit_sym = "°C" if w.units == "metric" else "°F"

        # Extract morning (~9h), noon (~12h), evening (~18h) from hourly forecast
        morning_temp: Optional[float] = None
        noon_temp: Optional[float] = None
        evening_temp: Optional[float] = None
        day_max_temp: Optional[float] = None

        if w.hourly_forecast:
            all_temps = [h.temperature for h in w.hourly_forecast]
            if all_temps:
                day_max_temp = max(all_temps)
            for h in w.hourly_forecast:
                if morning_temp is None and h.time.hour >= 9:
                    morning_temp = h.temperature
                if noon_temp is None and h.time.hour >= 12:
                    noon_temp = h.temperature
                if evening_temp is None and h.time.hour >= 18:
                    evening_temp = h.temperature
                if morning_temp is not None and noon_temp is not None and evening_temp is not None:
                    break

        if is_de:
            weather_line = (
                f"Wetter in {w.city}: {w.description}, aktuell {w.temperature}{unit_sym}"
            )
            if day_max_temp is not None:
                weather_line += f", Tageshöchst {round(day_max_temp)}{unit_sym}"
            time_parts: List[str] = []
            if morning_temp is not None:
                time_parts.append(f"Vormittag {round(morning_temp)}{unit_sym}")
            if noon_temp is not None:
                time_parts.append(f"Mittag {round(noon_temp)}{unit_sym}")
            if evening_temp is not None:
                time_parts.append(f"Abend {round(evening_temp)}{unit_sym}")
            if time_parts:
                weather_line += " | " + ", ".join(time_parts)
        else:
            weather_line = (
                f"Weather in {w.city}: {w.description}, currently {w.temperature}{unit_sym}"
            )
            if day_max_temp is not None:
                weather_line += f", daily high {round(day_max_temp)}{unit_sym}"
            time_parts = []
            if morning_temp is not None:
                time_parts.append(f"morning {round(morning_temp)}{unit_sym}")
            if noon_temp is not None:
                time_parts.append(f"noon {round(noon_temp)}{unit_sym}")
            if evening_temp is not None:
                time_parts.append(f"evening {round(evening_temp)}{unit_sym}")
            if time_parts:
                weather_line += " | " + ", ".join(time_parts)

        lines.append(weather_line)
        cautions = _weather_cautions()
        if cautions:
            lines.append("Wetter-Hinweise:" if is_de else "Weather precautions:")
            for caution in cautions:
                lines.append(f"  • {caution}")
        lines.append("")

    if summary.birthdays:
        lines.append("Geburtstage heute:" if is_de else "Birthdays today:")
        for b in summary.birthdays:
            age_str = f" (wird {b.age})" if (is_de and b.age) else (f" (turns {b.age})" if b.age else "")
            lines.append(f"  • {b.name}{age_str}")
        lines.append("")

    if summary.events:
        lines.append("Termine heute:" if is_de else "Events today:")
        sorted_events = sorted(summary.events, key=lambda e: e.start.astimezone(local_tz))
        for ev in sorted_events:
            local_start = ev.start.astimezone(local_tz)
            time_str = local_start.strftime("%H:%M")
            loc_str = f" @ {ev.location}" if ev.location else ""
            lines.append(f"  • {time_str} – {ev.title}{loc_str}")
        lines.append("")

    windows = _recommended_time_windows()
    if windows:
        lines.append("Empfohlene Zeitfenster:" if is_de else "Suggested time windows:")
        for w in windows:
            lines.append(f"  • {w}")
        lines.append("")

    if summary.todos:
        lines.append("Aufgaben:" if is_de else "Tasks:")
        for td in summary.todos:
            due_str = ""
            if td.due:
                local_due = td.due.astimezone(local_tz)
                due_str = (
                    f" (faellig: {local_due.strftime('%b %d')})"
                    if is_de
                    else f" (due: {local_due.strftime('%b %d')})"
                )
            lines.append(f"  • {td.title}{due_str}")
        lines.append("")

    data_text = "\n".join(lines)

    # Custom prompt template — replaces the built-in instruction when configured.
    # Supported placeholders: {language}, {date}, {data}
    if settings.AI_PROMPT_TEMPLATE:
        try:
            language_name = "Deutsch" if is_de else "English"
            return settings.AI_PROMPT_TEMPLATE.format_map({
                "language": language_name,
                "date": local_date.strftime("%A, %B %d, %Y"),
                "data": data_text,
            })
        except KeyError as exc:
            logger.warning("AI_PROMPT_TEMPLATE contains unknown placeholder %s – using default", exc)

    # Build family context from profiles
    family_context = _build_family_context()
    location = settings.WEATHER_CITY or "unbekannter Ort"
    weekday_de = local_date.strftime("%A")  # locale-independent fallback
    _de_weekdays = {
        "Monday": "Montag", "Tuesday": "Dienstag", "Wednesday": "Mittwoch",
        "Thursday": "Donnerstag", "Friday": "Freitag", "Saturday": "Samstag", "Sunday": "Sonntag",
    }
    weekday_de = _de_weekdays.get(local_date.strftime("%A"), local_date.strftime("%A"))
    is_weekend = local_date.weekday() >= 5

    time_blocks_format = (
        "\n\nTIME_BLOCKS:\n"
        "```json\n"
        "[{\"start\":\"09:00\",\"end\":\"11:00\",\"task\":\"...\",\"type\":\"focus\"}]\n"
        "```"
    )

    family_section = f"\n\nFAMILIE:\n{family_context}" if family_context else ""
    day_type = "Wochenende" if is_weekend else "Werktag"

    return (
        f"Du bist ein herzlicher, persoenlicher Familienassistent fuer den Ort {location}."
        f"{family_section}\n\n"
        "Schreibe ein sehr kurzes, warmes Tagesbriefing auf Deutsch (maximal 3 Saetze, beginne mit 'Guten Morgen'). "
        "Verwende KEIN Markdown. Kein **, kein *, kein #. Nur normalen Text. "
        "Hoechstens 1 Emoji im gesamten SUMMARY. "
        "Schreibe persoenlich (du/ihr), motivierend und alltagsnah. "
        f"Heute ist {weekday_de} ({day_type}). "
        "Passe die Vorschlaege ans Wetter an: bei Regen oder Kaelte Innenaktivitaeten, bei Sonne Outdoor-Ideen. "
        "Beziehe die Familienmitglieder ein: nenne konkrete, altersgerechte Aktivitaeten, Routinen und Interessen wenn passend. "
        "Falls heute Geburtstag ist, hebe ihn positiv hervor. "
        "Extrahiere danach exakt 3 Prioritaeten als nummerierte Liste (keine Erklaerungen, nur den Kern). "
        "Erstelle einen realistischen Tagesplan (maximal 5 Zeitbloecke). "
        "Typen: 'focus' (Fokuszeit), 'buffer' (Puffer/Uebergang), 'break' (Pause/Mahlzeit). "
        "Halte das FORMAT exakt ein — keine zusaetzlichen Abschnitte, keine Erklaerungen ausserhalb.\n\n"
        f"FORMAT (exakt so ausgeben):\n"
        f"SUMMARY:\n<maximal 3 Saetze>\n\n"
        f"PRIORITIES:\n1. ...\n2. ...\n3. ...{time_blocks_format}\n\n"
        f"DATA:\n{data_text}"
    )


def generate_summary(summary: DailySummary) -> DailySummary:
    """
    Call the configured AI provider to produce a narrative and top-3 priorities.

    The result is cached for the day identified by ``summary.date``.  Subsequent
    calls for the same calendar day return the cached text without hitting the
    AI API again, keeping quota usage to one call per day.

    Returns the enriched DailySummary (ai_summary + top_priorities filled in).
    """
    # Check the daily cache first
    cache_key = _cache_key(summary.date)
    if cache_key in _ai_summary_cache:
        cached = _ai_summary_cache[cache_key]
        logger.debug("AI summary cache hit for %s – skipping AI call", cache_key)
        summary.ai_summary = cached["ai_summary"]
        summary.top_priorities = cached["top_priorities"]
        summary.time_blocks = cached.get("time_blocks", [])
        return summary

    if not _is_configured():
        logger.warning(
            "AI provider '%s' is not configured (missing credential) – skipping AI summary",
            settings.AI_PROVIDER,
        )
        return summary

    if OpenAI is None:
        logger.warning("openai package not installed – skipping AI summary")
        return summary

    try:
        client = _get_client()
        model = _resolve_model()
        prompt = _build_prompt(summary)

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=700,
        )
        text: str = response.choices[0].message.content.strip()

        # Parse sections — robust against missing SUMMARY: marker
        ai_text: Optional[str] = None
        priorities: List[str] = []

        if "PRIORITIES:" in text:
            # Split on first PRIORITIES: — everything before is the summary
            summary_raw, _, prio_rest = text.partition("PRIORITIES:")
            ai_text = summary_raw.replace("SUMMARY:", "").strip()
            # Strip any TIME_BLOCKS: block that bled into the summary
            if "TIME_BLOCKS:" in ai_text:
                ai_text = ai_text.split("TIME_BLOCKS:")[0].strip()
            for line in prio_rest.splitlines():
                line = line.strip()
                if line and line[0].isdigit():
                    priorities.append(line.split(".", 1)[-1].strip())
        else:
            # Fallback: strip TIME_BLOCKS from the raw text
            ai_text = text.replace("SUMMARY:", "").split("TIME_BLOCKS:")[0].strip()

        time_blocks = _parse_time_blocks(text)

        summary.ai_summary = ai_text
        summary.top_priorities = priorities[:3]
        summary.time_blocks = time_blocks

        # Populate the daily cache
        _ai_summary_cache[cache_key] = {
            "ai_summary": ai_text,
            "top_priorities": priorities[:3],
            "time_blocks": time_blocks,
        }
        logger.info("AI summary cached for %s", cache_key)
        return summary

    except Exception as exc:
        logger.error("Failed to generate AI summary: %s", exc)
        return summary
