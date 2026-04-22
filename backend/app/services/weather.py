"""Weather service using WeatherAPI."""
import logging
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Optional

import httpx

from app.config import settings
from app.models.schemas import DailyForecastPoint, HourlyForecastPoint, WeatherInfo

logger = logging.getLogger(__name__)

_WEATHERAPI_BASE = "https://api.weatherapi.com/v1/forecast.json"
_CACHE_TTL = timedelta(minutes=30)
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


def _normalize_icon(icon: str) -> str:
    if icon.startswith("//"):
        return f"https:{icon}"
    return icon


def _read_temperature(values: dict, metric_key: str, imperial_key: str) -> float:
    if settings.WEATHER_UNITS == "imperial":
        return values[imperial_key]
    return values[metric_key]


def _build_hourly_forecast(data: dict) -> list[HourlyForecastPoint]:
    location = data.get("location", {})
    localtime = location.get("localtime")
    local_now = datetime.fromisoformat(localtime) if localtime else datetime.now()

    forecast_days = data.get("forecast", {}).get("forecastday", [])
    if not forecast_days:
        return []

    today_hours = forecast_days[0].get("hour", [])
    upcoming_hours = []
    for item in today_hours:
        item_time = datetime.fromisoformat(item["time"])
        if item_time >= local_now:
            upcoming_hours.append(item)

    return [
        HourlyForecastPoint(
            time=datetime.fromisoformat(item["time"]),
            temperature=_read_temperature(item, "temp_c", "temp_f"),
            icon=_normalize_icon(item.get("condition", {}).get("icon", "")),
            description=item.get("condition", {}).get("text", ""),
            chance_of_rain=item.get("chance_of_rain", 0),
        )
        for item in upcoming_hours
    ]


def _build_daily_forecast(data: dict) -> list[DailyForecastPoint]:
    forecast_days = data.get("forecast", {}).get("forecastday", [])

    # First day is "today". Dashboard panel should show the next three days.
    next_days = forecast_days[1:4]

    return [
        DailyForecastPoint(
            date=datetime.fromisoformat(item["date"]),
            min_temperature=_read_temperature(item["day"], "mintemp_c", "mintemp_f"),
            max_temperature=_read_temperature(item["day"], "maxtemp_c", "maxtemp_f"),
            icon=_normalize_icon(item["day"].get("condition", {}).get("icon", "")),
            description=item["day"].get("condition", {}).get("text", ""),
            chance_of_rain=item["day"].get("daily_chance_of_rain", 0),
        )
        for item in next_days
    ]


def fetch_weather(city: Optional[str] = None, force_refresh: bool = False) -> Optional[WeatherInfo]:
    """Fetch current weather for the configured city with forecast and 2-hour cache."""
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
        "days": 4,
        "aqi": "no",
        "alerts": "no",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(_WEATHERAPI_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()

        current = data["current"]
        condition = current["condition"]
        temperature = _read_temperature(current, "temp_c", "temp_f")
        feels_like = _read_temperature(current, "feelslike_c", "feelslike_f")
        wind_speed = current["wind_mph"] if settings.WEATHER_UNITS == "imperial" else round(current["wind_kph"] / 3.6, 2)

        weather = WeatherInfo(
            city=data["location"]["name"],
            temperature=temperature,
            feels_like=feels_like,
            description=condition["text"],
            icon=_normalize_icon(condition.get("icon", "")),
            humidity=current["humidity"],
            wind_speed=wind_speed,
            units=settings.WEATHER_UNITS,
            hourly_forecast=_build_hourly_forecast(data),
            daily_forecast=_build_daily_forecast(data),
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
