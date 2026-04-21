"""
AI summary service using OpenAI to generate a daily briefing and extract priorities.
"""
import logging
from typing import List, Optional

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore[assignment,misc]

from app.config import settings
from app.models.schemas import DailySummary

logger = logging.getLogger(__name__)


def _build_prompt(summary: DailySummary) -> str:
    lines: List[str] = [
        f"Datum: {summary.date.strftime('%A, %d. %B %Y')}",
        "",
    ]

    if summary.weather:
        w = summary.weather
        unit_sym = "°C" if w.units == "metric" else "°F"
        lines.append(
            f"Wetter in {w.city}: {w.description}, {w.temperature}{unit_sym} "
            f"(gefühlt {w.feels_like}{unit_sym}), Luftfeuchtigkeit {w.humidity}%, "
            f"Wind {w.wind_speed} {'m/s' if w.units == 'metric' else 'mph'}"
        )
        lines.append("")

    if summary.birthdays:
        lines.append("Geburtstage heute:")
        for b in summary.birthdays:
            age_str = f" (wird {b.age})" if b.age else ""
            lines.append(f"  • {b.name}{age_str}")
        lines.append("")

    if summary.events:
        lines.append("Termine heute:")
        for ev in summary.events:
            time_str = ev.start.strftime("%H:%M")
            loc_str = f" @ {ev.location}" if ev.location else ""
            lines.append(f"  • {time_str} – {ev.title}{loc_str}")
        lines.append("")

    if summary.todos:
        lines.append("Aufgaben:")
        for td in summary.todos:
            due_str = f" (fällig: {td.due.strftime('%d.%m.')})" if td.due else ""
            lines.append(f"  • {td.title}{due_str}")
        lines.append("")

    data_text = "\n".join(lines)

    return (
        "Du bist ein persönlicher Assistent. "
        "Erstelle auf Basis der folgenden Daten eine freundliche, prägnante "
        "Tages-Zusammenfassung auf Deutsch (maximal 5 Sätze). "
        "Extrahiere anschließend die 3 wichtigsten Prioritäten des Tages als "
        "nummerierte Liste.\n\n"
        "FORMAT:\nZUSAMMENFASSUNG:\n<text>\n\nPRIORITÄTEN:\n1. ...\n2. ...\n3. ...\n\n"
        f"DATEN:\n{data_text}"
    )


def generate_summary(summary: DailySummary) -> DailySummary:
    """
    Call OpenAI to produce an AI narrative and top-3 priorities.
    Returns the enriched DailySummary (ai_summary + top_priorities filled in).
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set – skipping AI summary")
        return summary

    if OpenAI is None:
        logger.warning("openai package not installed – skipping AI summary")
        return summary

    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        prompt = _build_prompt(summary)

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=512,
        )
        text: str = response.choices[0].message.content.strip()

        # Parse sections
        ai_text: Optional[str] = None
        priorities: List[str] = []

        if "ZUSAMMENFASSUNG:" in text and "PRIORITÄTEN:" in text:
            parts = text.split("PRIORITÄTEN:")
            ai_text = parts[0].replace("ZUSAMMENFASSUNG:", "").strip()
            prio_block = parts[1].strip()
            for line in prio_block.splitlines():
                line = line.strip()
                if line and line[0].isdigit():
                    # strip leading "1. " etc.
                    priorities.append(line.split(".", 1)[-1].strip())
        else:
            ai_text = text

        summary.ai_summary = ai_text
        summary.top_priorities = priorities[:3]
        return summary

    except Exception as exc:
        logger.error("Failed to generate AI summary: %s", exc)
        return summary
