"""
Push notification service using ntfy (https://ntfy.sh).
Sends the daily summary as a formatted push message.
"""
import logging
from datetime import datetime
from typing import Optional

import httpx
import pytz

from app.config import settings
from app.db.engine import get_session
from app.db.models import NotificationDedup
from app.models.schemas import DailySummary

logger = logging.getLogger(__name__)

_DEDUP_ROW_ID = 1


def _today_iso() -> str:
    tz = pytz.timezone(settings.APP_TIMEZONE)
    return datetime.now(tz).date().isoformat()


def _has_sent_today() -> bool:
    """Return True if a push notification was already sent today."""
    try:
        with get_session() as session:
            row = session.get(NotificationDedup, _DEDUP_ROW_ID)
            return row is not None and row.date == _today_iso()
    except Exception as exc:
        logger.warning("Could not read notification dedup marker: %s", exc)
        return False


def _mark_sent_today() -> None:
    """Persist today's date as the last-sent marker."""
    try:
        with get_session() as session:
            row = session.get(NotificationDedup, _DEDUP_ROW_ID)
            if row is None:
                session.add(NotificationDedup(id=_DEDUP_ROW_ID, date=_today_iso()))
            else:
                row.date = _today_iso()
    except Exception as exc:
        logger.warning("Could not write notification dedup marker: %s", exc)


def _build_message(summary: DailySummary) -> str:
    lines = []

    if summary.ai_summary:
        lines.append(summary.ai_summary)
        lines.append("")

    if summary.top_priorities:
        lines.append("Top Priorities:")
        for i, p in enumerate(summary.top_priorities, 1):
            lines.append(f"  {i}. {p}")
        lines.append("")

    if summary.weather:
        w = summary.weather
        unit_sym = "°C" if w.units == "metric" else "°F"
        lines.append(
            f"🌤 {w.city}: {w.description}, {w.temperature}{unit_sym}"
        )

    if summary.events:
        lines.append(f"📅 {len(summary.events)} event(s) today")

    if summary.birthdays:
        names = ", ".join(b.name for b in summary.birthdays)
        lines.append(f"🎂 Birthday: {names}")

    return "\n".join(lines)


def send_daily_push(summary: DailySummary) -> bool:
    """Send the daily summary as a push notification via ntfy.

    Returns False without sending if a notification was already sent today
    (dedup) or if ntfy is not configured.
    """
    if not settings.NTFY_TOPIC:
        logger.warning("NTFY_TOPIC not configured – skipping push notification")
        return False

    if _has_sent_today():
        logger.info("Push notification already sent today – skipping duplicate")
        return False

    url = f"{settings.NTFY_SERVER.rstrip('/')}/{settings.NTFY_TOPIC}"
    message = _build_message(summary)
    # HTTP headers are ASCII-only in the request stack, so keep title plain ASCII.
    title = f"Good morning - {summary.date.strftime('%B %d, %Y')}"

    headers = {
        "Title": title,
        "Priority": "default",
        "Tags": "sunny,calendar",
        "Content-Type": "text/plain; charset=utf-8",
    }
    if settings.NTFY_TOKEN:
        headers["Authorization"] = f"Bearer {settings.NTFY_TOKEN}"

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, content=message.encode("utf-8"), headers=headers)
            resp.raise_for_status()
        logger.info("Push notification sent to %s", url)
        _mark_sent_today()
        return True
    except httpx.HTTPStatusError as exc:
        logger.error(
            "ntfy HTTP error %s: %s", exc.response.status_code, exc.response.text
        )
    except Exception as exc:
        logger.error("Failed to send push notification: %s", exc)

    return False
