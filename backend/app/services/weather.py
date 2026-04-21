"""
Weather service using OpenWeatherMap API.
"""
import logging
from typing import Optional

import httpx

from app.config import settings
from app.models.schemas import WeatherInfo

logger = logging.getLogger(__name__)

_OWM_BASE = "https://api.openweathermap.org/data/2.5/weather"


def fetch_weather(city: Optional[str] = None) -> Optional[WeatherInfo]:
    """Fetch current weather for the configured city."""
    api_key = settings.OPENWEATHERMAP_API_KEY
    if not api_key:
        logger.warning("OPENWEATHERMAP_API_KEY not set – skipping weather")
        return None

    target_city = city or settings.WEATHER_CITY
    params = {
        "q": target_city,
        "appid": api_key,
        "units": settings.WEATHER_UNITS,
        "lang": "de",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(_OWM_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

        return WeatherInfo(
            city=data["name"],
            temperature=data["main"]["temp"],
            feels_like=data["main"]["feels_like"],
            description=data["weather"][0]["description"],
            icon=data["weather"][0]["icon"],
            humidity=data["main"]["humidity"],
            wind_speed=data["wind"]["speed"],
            units=settings.WEATHER_UNITS,
        )
    except httpx.HTTPStatusError as exc:
        logger.error("Weather API HTTP error %s: %s", exc.response.status_code, exc)
    except Exception as exc:
        logger.error("Failed to fetch weather: %s", exc)

    return None
