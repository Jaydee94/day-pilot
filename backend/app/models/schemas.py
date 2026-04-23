from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: datetime
    end: datetime
    location: Optional[str] = None
    description: Optional[str] = None
    source: str  # "ical" | "apple" | "local"
    calendar_name: Optional[str] = None  # e.g. "Bdays", "Work", …


class TodoItem(BaseModel):
    id: str
    title: str
    due: Optional[datetime] = None
    completed: bool = False
    priority: Optional[int] = None  # 1 (high) – 9 (low)
    source: str  # "google" | "apple" | "local"


class CalDAVAccount(BaseModel):
    """A single CalDAV account configuration."""

    url: str
    username: Optional[str] = ""
    password: Optional[str] = ""


class Birthday(BaseModel):
    name: str
    date: datetime
    age: Optional[int] = None


class HourlyForecastPoint(BaseModel):
    time: datetime
    temperature: float
    icon: str
    description: str
    chance_of_rain: int


class DailyForecastPoint(BaseModel):
    date: datetime
    min_temperature: float
    max_temperature: float
    icon: str
    description: str
    chance_of_rain: int


class WeatherInfo(BaseModel):
    city: str
    temperature: float
    feels_like: float
    description: str
    icon: str
    humidity: int
    wind_speed: float
    units: str  # "metric" | "imperial"
    hourly_forecast: List[HourlyForecastPoint] = []
    daily_forecast: List[DailyForecastPoint] = []


class DailySummary(BaseModel):
    date: datetime
    events: List[CalendarEvent] = []
    todos: List[TodoItem] = []
    birthdays: List[Birthday] = []
    weather: Optional[WeatherInfo] = None
    ai_summary: Optional[str] = None
    top_priorities: List[str] = []


class CreateEventRequest(BaseModel):
    title: str
    start: datetime
    end: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None


class CreateTodoRequest(BaseModel):
    title: str
    due: Optional[datetime] = None


class VoiceCommand(BaseModel):
    secret: str
    command: str  # "add_event" | "add_todo"
    title: str
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    due: Optional[datetime] = None
    location: Optional[str] = None


class SyncStatus(BaseModel):
    ical_calendar: bool = False
    apple_calendar: bool = False
    weather: bool = False
    last_sync: Optional[datetime] = None
    errors: List[str] = []


class AIModelInfo(BaseModel):
    """Information about a single AI model available through a provider."""

    id: str
    name: str
    provider: str  # "openai" | "github"


class AIConfig(BaseModel):
    """Current AI provider configuration."""

    provider: str  # "openai" | "github"
    model: str
    configured: bool


class ScheduledJob(BaseModel):
    """A single APScheduler job with its next run time."""

    id: str
    name: str
    description: str
    trigger: str
    next_run: Optional[datetime] = None


class UserSettings(BaseModel):
    """User-configurable settings.

    All fields are ``Optional`` so that the client can send partial updates.
    When used as a GET response every field will be populated with the
    current effective value.
    """

    APP_NAME: Optional[str] = None
    APP_TIMEZONE: Optional[str] = None
    APP_LANGUAGE: Optional[str] = None
    DAILY_SUMMARY_TIME: Optional[str] = None
    AI_PROVIDER: Optional[str] = None
    AI_MODEL: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: Optional[str] = None
    GITHUB_TOKEN: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GOOGLE_AI_API_KEY: Optional[str] = None
    WEATHERAPI_API_KEY: Optional[str] = None
    WEATHER_CITY: Optional[str] = None
    WEATHER_UNITS: Optional[str] = None
    ICAL_URLS: Optional[str] = None
    # Structured iCal feeds (JSON array of {url, is_birthday}).
    ICAL_FEEDS: Optional[str] = None
    # Comma-separated list of calendar names treated as birthday-only calendars.
    BIRTHDAY_CALENDAR_NAMES: Optional[str] = None
    CALDAV_URL: Optional[str] = None
    CALDAV_USERNAME: Optional[str] = None
    CALDAV_PASSWORD: Optional[str] = None
    # Multiple CalDAV accounts (JSON array of {url, username, password})
    CALDAV_CONFIGS: Optional[str] = None
    NTFY_SERVER: Optional[str] = None
    NTFY_TOPIC: Optional[str] = None
    NTFY_TOKEN: Optional[str] = None
    VOICE_WEBHOOK_SECRET: Optional[str] = None
    SETUP_COMPLETE: Optional[bool] = None


class SetupStatus(BaseModel):
    """Setup / onboarding status returned by ``GET /api/settings/status``."""

    setup_complete: bool
    needs_setup: bool


class GoogleCredentialInfo(BaseModel):
    """Info about a single configured Google credentials file."""

    index: int
    path: str
    filename: str
    exists: bool


class IntegrationTestRequest(BaseModel):
    """Payload for testing a specific integration with optional temporary setting overrides."""

    overrides: Optional[UserSettings] = None


class ICalFeedAddRequest(BaseModel):
    """Payload for adding a new iCal feed URL."""

    url: str
    is_birthday: bool = False


class ICalFeedPatchRequest(BaseModel):
    """Payload for updating an existing iCal feed entry (e.g. toggling the birthday flag)."""

    is_birthday: Optional[bool] = None


class IntegrationTestResult(BaseModel):
    """Result of a single integration connection test."""

    integration: str
    ok: bool
    message: str
