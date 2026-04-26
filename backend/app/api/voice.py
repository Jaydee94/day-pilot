"""
Voice-control webhook endpoint.
Supports Siri Shortcuts (HTTP POST) and can be used with Google Assistant via IFTTT/webhooks.

All requests must include the configured VOICE_WEBHOOK_SECRET.
"""
import logging
from datetime import timedelta

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import VoiceCommand
from app.services.calendar_sync import add_apple_event
from app.services.local_calendar import add_local_event
from app.services.local_todos import add_local_todo

logger = logging.getLogger(__name__)
voice_router = APIRouter()


@voice_router.post("/voice/command", summary="Add event/todo via voice command")
def voice_command(cmd: VoiceCommand):
    """
    Accepts a voice command payload (from Siri Shortcuts or Google Assistant webhook).
    Validates the secret and adds the event/todo to the calendar.

    Example payload for Siri Shortcut:
    ```json
    {
      "secret": "your-secret",
      "command": "add_event",
      "title": "Meeting with Bob",
      "start": "2024-06-01T14:00:00+02:00",
      "end": "2024-06-01T15:00:00+02:00",
      "location": "Office"
    }
    ```
    """
    if cmd.secret != settings.VOICE_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    if cmd.command == "add_event":
        if not cmd.start:
            raise HTTPException(status_code=400, detail="'start' is required for add_event")
        end = cmd.end or cmd.start + timedelta(hours=1)

        # Try Apple CalDAV first, fall back to local calendar
        ok = add_apple_event(
            title=cmd.title,
            start=cmd.start,
            end=end,
            location=cmd.location,
        )
        if ok:
            return {"status": "created", "source": "apple"}

        event = add_local_event(
            title=cmd.title,
            start=cmd.start,
            end=end,
            location=cmd.location,
        )
        return {"status": "created", "source": "local", "event": event}

    if cmd.command == "add_todo":
        todo = add_local_todo(title=cmd.title, due=cmd.due)
        return {"status": "created", "source": "local", "todo": todo}

    raise HTTPException(status_code=400, detail=f"Unknown command: {cmd.command}")
