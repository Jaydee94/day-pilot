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
        f"Date: {summary.date.strftime('%A, %B %d, %Y')}",
        "",
    ]

    if summary.weather:
        w = summary.weather
        unit_sym = "°C" if w.units == "metric" else "°F"
        lines.append(
            f"Weather in {w.city}: {w.description}, {w.temperature}{unit_sym} "
            f"(feels like {w.feels_like}{unit_sym}), humidity {w.humidity}%, "
            f"wind {w.wind_speed} {'m/s' if w.units == 'metric' else 'mph'}"
        )
        lines.append("")

    if summary.birthdays:
        lines.append("Birthdays today:")
        for b in summary.birthdays:
            age_str = f" (turns {b.age})" if b.age else ""
            lines.append(f"  • {b.name}{age_str}")
        lines.append("")

    if summary.events:
        lines.append("Events today:")
        for ev in summary.events:
            time_str = ev.start.strftime("%H:%M")
            loc_str = f" @ {ev.location}" if ev.location else ""
            lines.append(f"  • {time_str} – {ev.title}{loc_str}")
        lines.append("")

    if summary.todos:
        lines.append("Tasks:")
        for td in summary.todos:
            due_str = f" (due: {td.due.strftime('%b %d')})" if td.due else ""
            lines.append(f"  • {td.title}{due_str}")
        lines.append("")

    data_text = "\n".join(lines)

    return (
        "You are a friendly personal assistant for a family. "
        "Based on the following data, write a warm, concise daily briefing in English "
        "(maximum 5 sentences, starting with 'Good morning'). "
        "Then extract the 3 most important priorities for the day as a numbered list.\n\n"
        "FORMAT:\nSUMMARY:\n<text>\n\nPRIORITIES:\n1. ...\n2. ...\n3. ...\n\n"
        f"DATA:\n{data_text}"
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

        if "SUMMARY:" in text and "PRIORITIES:" in text:
            parts = text.split("PRIORITIES:")
            ai_text = parts[0].replace("SUMMARY:", "").strip()
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
