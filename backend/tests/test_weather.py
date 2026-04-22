"""
Tests for the weather service.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
import pytest

from app.models.schemas import WeatherInfo


class TestFetchWeather:
    @pytest.fixture(autouse=True)
    def clear_weather_cache(self):
        from app.services import weather as weather_module
        weather_module._weather_cache.clear()

    def test_returns_none_when_no_api_key(self, monkeypatch):
        monkeypatch.setattr("app.services.weather.settings.WEATHERAPI_API_KEY", "")
        from app.services.weather import fetch_weather
        result = fetch_weather()
        assert result is None

    def test_returns_weather_info_on_success(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHERAPI_API_KEY", "fake-key"
        )
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHER_CITY", "Berlin"
        )
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHER_UNITS", "metric"
        )

        fake_response_data = {
            "location": {"name": "Berlin"},
            "current": {
                "temp_c": 22.5,
                "temp_f": 72.5,
                "feelslike_c": 21.0,
                "feelslike_f": 69.8,
                "humidity": 55,
                "wind_kph": 12.6,
                "wind_mph": 7.8,
                "condition": {
                    "text": "Sunny",
                    "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png",
                },
            },
        }

        mock_resp = MagicMock()
        mock_resp.json.return_value = fake_response_data
        mock_resp.raise_for_status = MagicMock()

        with patch("app.services.weather.httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get.return_value = mock_resp
            mock_client_cls.return_value = mock_client

            from app.services.weather import fetch_weather
            result = fetch_weather()

        assert result is not None
        assert isinstance(result, WeatherInfo)
        assert result.city == "Berlin"
        assert result.temperature == 22.5
        assert result.humidity == 55
        assert result.icon.startswith("https://")
        assert result.units == "metric"

    def test_returns_none_on_http_error(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHERAPI_API_KEY", "fake-key"
        )
        import httpx

        with patch("app.services.weather.httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_response = MagicMock()
            mock_response.status_code = 401
            mock_client.get.return_value.raise_for_status.side_effect = (
                httpx.HTTPStatusError("Unauthorized", request=MagicMock(), response=mock_response)
            )
            mock_client_cls.return_value = mock_client

            from app.services.weather import fetch_weather
            result = fetch_weather()

        assert result is None

    def test_returns_cached_weather_within_two_hours(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHERAPI_API_KEY", "fake-key"
        )
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHER_CITY", "Berlin"
        )
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHER_UNITS", "metric"
        )

        from app.services import weather as weather_module

        cached_weather = WeatherInfo(
            city="Berlin",
            temperature=20.0,
            feels_like=19.0,
            description="Cloudy",
            icon="https://cdn.weatherapi.com/weather/64x64/day/119.png",
            humidity=65,
            wind_speed=3.2,
            units="metric",
        )

        key = weather_module._cache_key("Berlin", "metric")
        weather_module._weather_cache[key] = (
            datetime.now(timezone.utc) - timedelta(minutes=30),
            cached_weather,
        )

        with patch("app.services.weather.httpx.Client") as mock_client_cls:
            from app.services.weather import fetch_weather
            result = fetch_weather()

        assert result == cached_weather
        mock_client_cls.assert_not_called()

    def test_returns_stale_cache_if_api_fails(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHERAPI_API_KEY", "fake-key"
        )
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHER_CITY", "Berlin"
        )
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHER_UNITS", "metric"
        )

        from app.services import weather as weather_module
        import httpx

        stale_weather = WeatherInfo(
            city="Berlin",
            temperature=16.0,
            feels_like=15.5,
            description="Rain",
            icon="https://cdn.weatherapi.com/weather/64x64/day/296.png",
            humidity=80,
            wind_speed=5.1,
            units="metric",
        )

        key = weather_module._cache_key("Berlin", "metric")
        weather_module._weather_cache[key] = (
            datetime.now(timezone.utc) - timedelta(hours=3),
            stale_weather,
        )

        with patch("app.services.weather.httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_response = MagicMock()
            mock_response.status_code = 503
            mock_client.get.return_value.raise_for_status.side_effect = (
                httpx.HTTPStatusError("Unavailable", request=MagicMock(), response=mock_response)
            )
            mock_client_cls.return_value = mock_client

            from app.services.weather import fetch_weather
            result = fetch_weather()

        assert result == stale_weather
