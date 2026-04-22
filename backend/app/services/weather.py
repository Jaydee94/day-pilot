"""Weather service using WeatherAPI."""
import logging
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Optional

import httpx

from app.config import settings
from app.models.schemas import WeatherInfo

logger = logging.getLogger(__name__)

_WEATHERAPI_BASE = "https://api.weatherapi.com/v1/current.json"
_CACHE_TTL = timedelta(hours=2)
_cache_lock = Lock()
_weather_cache: dict[tuple[str, str], tuple[datetime, WeatherInfo]] = {}


def _cache_key(city: str, units: str) -> tuple[str, str]:
    return (city.strip().lower(), units)


def _read_cached_weather(key: tuple[str, str]) -> Optional[tuple[datetime, WeatherInfo]]:
    with _cache_lock:
        return _weather_cache.get(key)


def _write_cached_weather(key: tuple[str, str], weather: WeatherInfo) -> None:
    with _cache_lock:
        _weather_cache[key] = (datetime.now(timezone.utc), weather)


def fetch_weather(city: Optional[str] = None, force_refresh: bool = False) -> Optional[WeatherInfo]:
    """Fetch current weather for the configured city with a 2-hour cache."""
    target_city = city or settings.WEATHER_CITY
    key = _cache_key(target_city, settings.WEATHER_UNITS)
    now = datetime.now(timezone.utc)

    cached = _read_cached_weather(key)
    if cached and not force_refresh:
        cached_at, cached_weather = cached
        if now - cached_at < _CACHE_TTL:
            return cached_weather

    api_key = settings.WEATHERAPI_API_KEY
    if not api_key:
        logger.warning("WEATHERAPI_API_KEY not set - skipping weather")
        if cached:
            logger.info("Using stale cached weather because API key is missing")
            return cached[1]
        return None

    params = {
        "key": api_key,
        "q": target_city,
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(_WEATHERAPI_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

        current = data["current"]
        condition = current["condition"]
        icon = condition.get("icon", "")
        if icon.startswith("//"):
            icon = f"https:{icon}"

        if settings.WEATHER_UNITS == "imperial":
            temperature = current["temp_f"]
            feels_like = current["feelslike_f"]
            wind_speed = current["wind_mph"]
        else:
            temperature = current["temp_c"]
            feels_like = current["feelslike_c"]
            # WeatherAPI returns kph; convert to m/s for metric mode.
            wind_speed = round(current["wind_kph"] / 3.6, 2)

        weather = WeatherInfo(
            city=data["location"]["name"],
            temperature=temperature,
            feels_like=feels_like,
            description=condition["text"],
            icon=icon,
            humidity=current["humidity"],
            wind_speed=wind_speed,
            units=settings.WEATHER_UNITS,
        )
        _write_cached_weather(key, weather)
        return weather
    except httpx.HTTPStatusError as exc:
        logger.error("Weather API HTTP error %s: %s", exc.response.status_code, exc)
    except Exception as exc:
        logger.error("Failed to fetch weather: %s", exc)

    if cached:
        logger.info("Using stale cached weather after WeatherAPI request failure")
        return cached[1]

    return None


def refresh_weather_cache() -> Optional[WeatherInfo]:
    """Force-refresh weather cache for the configured city."""
    return fetch_weather(force_refresh=True)
