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


class WeatherInfo(BaseModel):
    city: str
    temperature: float
    feels_like: float
    description: str
    icon: str
    humidity: int
    wind_speed: float
    units: str  # "metric" | "imperial"


class DailySummary(BaseModel):
    date: datetime
    events: List[CalendarEvent] = []
    todos: List[TodoItem] = []
    birthdays: List[Birthday] = []
    weather: Optional[WeatherInfo] = None
    ai_summary: Optional[str] = None
    top_priorities: List[str] = []


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
