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
    source: str  # "google" | "apple"


class TodoItem(BaseModel):
    id: str
    title: str
    due: Optional[datetime] = None
    completed: bool = False
    priority: Optional[int] = None  # 1 (high) – 9 (low)
    source: str  # "google" | "apple"


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
    google_calendar: bool = False
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


class UserSettings(BaseModel):
    """User-configurable settings.

    All fields are ``Optional`` so that the client can send partial updates.
    When used as a GET response every field will be populated with the
    current effective value.
    """

    APP_NAME: Optional[str] = None
    APP_TIMEZONE: Optional[str] = None
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
    CALDAV_URL: Optional[str] = None
    CALDAV_USERNAME: Optional[str] = None
    CALDAV_PASSWORD: Optional[str] = None
    NTFY_SERVER: Optional[str] = None
    NTFY_TOPIC: Optional[str] = None
    NTFY_TOKEN: Optional[str] = None
    VOICE_WEBHOOK_SECRET: Optional[str] = None
    SETUP_COMPLETE: Optional[bool] = None


class SetupStatus(BaseModel):
    """Setup / onboarding status returned by ``GET /api/settings/status``."""

    setup_complete: bool
    needs_setup: bool
