"""
Push notification service using ntfy (https://ntfy.sh).
Sends the daily summary as a formatted push message.
"""
import json
import logging
import os
from datetime import datetime
from typing import Optional

import httpx
import pytz

from app.config import settings
from app.models.schemas import DailySummary

logger = logging.getLogger(__name__)


def _today_iso() -> str:
    tz = pytz.timezone(settings.APP_TIMEZONE)
    return datetime.now(tz).date().isoformat()


def _has_sent_today() -> bool:
    """Return True if a push notification was already sent today."""
    path = settings.NOTIFICATIONS_DEDUP_FILE
    if not os.path.exists(path):
        return False
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("date") == _today_iso()
    except Exception as exc:
        logger.warning("Could not read dedup file %s: %s", path, exc)
        return False


def _mark_sent_today() -> None:
    """Persist today's date as the last-sent marker."""
    path = settings.NOTIFICATIONS_DEDUP_FILE
    dir_name = os.path.dirname(os.path.abspath(path))
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"date": _today_iso()}, f)
    except Exception as exc:
        logger.warning("Could not write dedup file %s: %s", path, exc)


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
