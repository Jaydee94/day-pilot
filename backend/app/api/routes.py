"""
API routes for Day Pilot.
"""
import logging
from datetime import datetime
from typing import Optional

import pytz
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.schemas import DailySummary, SyncStatus, VoiceCommand
from app.services.scheduler import build_daily_summary, run_daily_pipeline
from app.services.calendar_sync import (
    fetch_google_events,
    fetch_apple_events,
    fetch_google_tasks,
    fetch_google_birthdays,
    add_google_event,
    add_apple_event,
)
from app.services.weather import fetch_weather
from app.services.notifications import send_daily_push

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/summary", response_model=DailySummary, summary="Get today's daily summary")
def get_summary(
    date: Optional[str] = Query(
        None, description="ISO date (YYYY-MM-DD) – defaults to today"
    )
):
    """Return the full daily summary (calendar events, todos, weather, AI text)."""
    target: Optional[datetime] = None
    if date:
        try:
            tz = pytz.timezone(settings.APP_TIMEZONE)
            target = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=tz)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    return build_daily_summary(date=target)


@router.post("/summary/push", summary="Trigger push notification manually")
def push_summary():
    """Build and immediately push today's summary."""
    summary = build_daily_summary()
    ok = send_daily_push(summary)
    return {"sent": ok}


@router.post("/pipeline/run", summary="Trigger the full daily pipeline")
def trigger_pipeline():
    """Manually trigger the daily pipeline (build + push)."""
    run_daily_pipeline()
    return {"status": "pipeline triggered"}


@router.get("/status", response_model=SyncStatus, summary="Service health / sync status")
def get_status():
    """Quick health check for each integration."""
    from app.services.calendar_sync import fetch_google_events, fetch_apple_events

    errors = []
    google_ok = False
    apple_ok = False

    try:
        fetch_google_events()
        google_ok = True
    except Exception as exc:
        errors.append(f"Google Calendar: {exc}")

    try:
        fetch_apple_events()
        apple_ok = True
    except Exception as exc:
        errors.append(f"Apple Calendar: {exc}")

    weather_ok = fetch_weather() is not None

    return SyncStatus(
        google_calendar=google_ok,
        apple_calendar=apple_ok,
        weather=weather_ok,
        last_sync=datetime.now(pytz.timezone(settings.APP_TIMEZONE)),
        errors=errors,
    )


@router.get("/events", summary="List today's calendar events")
def list_events(
    date: Optional[str] = Query(None, description="ISO date YYYY-MM-DD")
):
    target: Optional[datetime] = None
    if date:
        try:
            tz = pytz.timezone(settings.APP_TIMEZONE)
            target = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=tz)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format.")
    google = fetch_google_events(date=target)
    apple = fetch_apple_events(date=target)
    all_events = sorted(google + apple, key=lambda e: e.start)
    return all_events


@router.get("/todos", summary="List open to-dos")
def list_todos():
    return fetch_google_tasks()


@router.get("/weather", summary="Current weather")
def get_weather():
    weather = fetch_weather()
    if not weather:
        raise HTTPException(status_code=503, detail="Weather data unavailable")
    return weather


@router.get("/birthdays", summary="Today's birthdays")
def list_birthdays():
    return fetch_google_birthdays()
