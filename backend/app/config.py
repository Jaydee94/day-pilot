from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # General
    APP_NAME: str = "Day Pilot"
    APP_TIMEZONE: str = "Europe/Berlin"
    DAILY_SUMMARY_TIME: str = "07:00"  # HH:MM in APP_TIMEZONE

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Weather (OpenWeatherMap)
    OPENWEATHERMAP_API_KEY: str = ""
    WEATHER_CITY: str = "Berlin"
    WEATHER_UNITS: str = "metric"  # metric | imperial

    # Google Calendar
    GOOGLE_CREDENTIALS_JSON: str = ""  # path to credentials.json
    GOOGLE_TOKEN_JSON: str = "/app/data/google_token.json"

    # Apple / CalDAV Calendar
    CALDAV_URL: str = ""  # e.g. https://caldav.icloud.com
    CALDAV_USERNAME: str = ""
    CALDAV_PASSWORD: str = ""

    # Push Notifications (ntfy.sh)
    NTFY_SERVER: str = "https://ntfy.sh"
    NTFY_TOPIC: str = ""
    NTFY_TOKEN: str = ""

    # Voice Webhook secret (used by Siri Shortcuts / Google Assistant IFTTT)
    VOICE_WEBHOOK_SECRET: str = "change-me-in-production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
