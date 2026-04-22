"""
APScheduler-based daily summary scheduler.
Runs the full pipeline: sync calendars → fetch weather → AI summary → push.
"""
import logging
from datetime import datetime
from typing import Optional

import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.models.schemas import DailySummary
from app.services.calendar_sync import (
    fetch_google_events,
    fetch_google_tasks,
    fetch_google_birthdays,
    fetch_apple_events,
)
from app.services.weather import fetch_weather
from app.services.weather import refresh_weather_cache
from app.services.ai_summary import generate_summary
from app.services.notifications import send_daily_push

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None


def build_daily_summary(date: Optional[datetime] = None) -> DailySummary:
    """Collect all data and build a DailySummary for *date* (defaults to today)."""
    tz = pytz.timezone(settings.APP_TIMEZONE)
    target_date = date or datetime.now(tz)

    google_events = fetch_google_events(date=target_date)
    apple_events = fetch_apple_events(date=target_date)
    all_events = sorted(
        google_events + apple_events, key=lambda e: e.start
    )

    google_tasks = fetch_google_tasks()
    weather = fetch_weather()
    birthdays = fetch_google_birthdays()

    summary = DailySummary(
        date=target_date,
        events=all_events,
        todos=google_tasks,
        weather=weather,
        birthdays=birthdays,
    )

    summary = generate_summary(summary)
    return summary


def run_daily_pipeline() -> None:
    """Full daily pipeline: build summary and push it."""
    logger.info("Running daily summary pipeline…")
    try:
        summary = build_daily_summary()
        send_daily_push(summary)
        logger.info("Daily pipeline completed successfully.")
    except Exception as exc:
        logger.error("Daily pipeline failed: %s", exc)


def run_weather_cache_refresh() -> None:
    """Refresh cached weather data on a fixed schedule."""
    logger.info("Refreshing weather cache…")
    try:
        refresh_weather_cache()
        logger.info("Weather cache refresh completed.")
    except Exception as exc:
        logger.error("Weather cache refresh failed: %s", exc)


def start_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    hour, minute = settings.DAILY_SUMMARY_TIME.split(":")
    tz = pytz.timezone(settings.APP_TIMEZONE)

    _scheduler = BackgroundScheduler(timezone=tz)
    _scheduler.add_job(
        run_daily_pipeline,
        CronTrigger(hour=int(hour), minute=int(minute), timezone=tz),
        id="daily_summary",
        replace_existing=True,
    )
    _scheduler.add_job(
        run_weather_cache_refresh,
        IntervalTrigger(minutes=30, timezone=tz),
        id="weather_cache_refresh",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        "Scheduler started – daily summary at %s %s",
        settings.DAILY_SUMMARY_TIME,
        settings.APP_TIMEZONE,
    )


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")


_JOB_DESCRIPTIONS: dict[str, str] = {
    "daily_summary": "Builds the DayPilot briefing and sends a push notification",
    "weather_cache_refresh": "Refreshes the weather cache with the latest forecast data",
}

_JOB_RUNNERS: dict[str, object] = {
    "daily_summary": run_daily_pipeline,
    "weather_cache_refresh": run_weather_cache_refresh,
}


def get_jobs() -> list[dict]:
    """Return metadata for all registered scheduler jobs."""
    if not _scheduler or not _scheduler.running:
        return []
    result = []
    for job in _scheduler.get_jobs():
        result.append({
            "id": job.id,
            "name": job.name,
            "description": _JOB_DESCRIPTIONS.get(job.id, ""),
            "trigger": str(job.trigger),
            "next_run": job.next_run_time,
        })
    return result


def trigger_job(job_id: str) -> bool:
    """Manually fire a job by its ID in a background thread. Returns False if unknown."""
    import threading
    runner = _JOB_RUNNERS.get(job_id)
    if runner is None:
        return False
    threading.Thread(target=runner, daemon=True).start()
    return True
