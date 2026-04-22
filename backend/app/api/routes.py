"""
API routes for Day Pilot.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional

import pytz
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.schemas import (
    AIConfig,
    AIModelInfo,
    DailySummary,
    ScheduledJob,
    SyncStatus,
    VoiceCommand,
    CreateEventRequest,
    CreateTodoRequest,
)
from app.services.scheduler import build_daily_summary, run_daily_pipeline, get_jobs, trigger_job
from app.services.calendar_sync import (
    fetch_google_events,
    fetch_apple_events,
    fetch_google_tasks,
    fetch_google_birthdays,
    add_google_event,
    add_apple_event,
    add_google_task,
)
from app.services.local_calendar import (
    fetch_local_events,
    add_local_event,
    delete_local_event,
)
from app.services.weather import fetch_weather
from app.services.notifications import send_daily_push
from app.services.ai_summary import get_ai_config, list_models

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
    local = fetch_local_events(date=target)
    all_events = sorted(google + apple + local, key=lambda e: e.start)
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


@router.post("/events", summary="Create a calendar event")
def create_event(payload: CreateEventRequest):
    """Add a new event.

    The event is written to the first available calendar in priority order:
    1. Google Calendar (primary account)
    2. Apple / CalDAV calendar (first configured account)
    3. Internal local calendar (always available, no external credentials needed)
    """
    end = payload.end or payload.start + timedelta(hours=1)

    event = add_google_event(
        title=payload.title,
        start=payload.start,
        end=end,
        location=payload.location,
    )
    if event:
        return event

    ok = add_apple_event(
        title=payload.title,
        start=payload.start,
        end=end,
        location=payload.location,
    )
    if ok:
        return {"status": "created", "source": "apple", "title": payload.title}

    # Fall back to the internal local calendar so users can always create events
    # even without any external calendar configured.
    local_event = add_local_event(
        title=payload.title,
        start=payload.start,
        end=end,
        location=payload.location,
        description=payload.description,
    )
    return local_event


@router.delete("/events/{event_id}", summary="Delete a local calendar event")
def delete_event(event_id: str):
    """Delete an event from the internal local calendar.

    Only locally stored events (source='local') can be deleted through this
    endpoint.  Events from external calendars must be managed in the
    respective calendar app.
    """
    removed = delete_local_event(event_id)
    if not removed:
        raise HTTPException(
            status_code=404,
            detail=f"No local event with id '{event_id}' found. Only internal events can be deleted here.",
        )
    return {"status": "deleted", "event_id": event_id}


@router.post("/todos", summary="Create a task")
def create_todo(payload: CreateTodoRequest):
    """Add a new task to Google Tasks."""
    todo = add_google_task(title=payload.title, due=payload.due)
    if todo:
        return todo
    raise HTTPException(status_code=503, detail="Could not add task to Google Tasks")


@router.get("/ai/config", response_model=AIConfig, summary="Current AI provider configuration")
def get_ai_configuration():
    """Return the active AI provider, selected model, and whether a credential is configured."""
    return get_ai_config()


@router.get("/ai/models", response_model=List[AIModelInfo], summary="List available AI models")
def list_ai_models():
    """
    Return models available for the configured AI provider.

    For the ``github`` provider this fetches the live model list from GitHub Models
    (falls back to a built-in list if the API is unreachable).
    For the ``openai`` provider an empty list is returned — set ``AI_MODEL`` directly.
    """
    return list_models()


@router.get("/scheduler/jobs", response_model=List[ScheduledJob], summary="List scheduled jobs")
def get_scheduler_jobs():
    """Return all registered scheduler jobs with their next run times."""
    return get_jobs()


@router.post("/scheduler/jobs/{job_id}/run", summary="Manually trigger a scheduled job")
def run_scheduled_job(job_id: str):
    """Manually fire a scheduled job immediately (runs in background)."""
    ok = trigger_job(job_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"No job with id '{job_id}'")
    return {"status": "triggered", "job_id": job_id}
