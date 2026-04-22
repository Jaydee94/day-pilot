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
            "location": {
                "name": "Berlin",
                "localtime": "2026-04-22 10:00",
            },
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
            "forecast": {
                "forecastday": [
                    {
                        "date": "2026-04-22",
                        "day": {
                            "mintemp_c": 12.0,
                            "mintemp_f": 53.6,
                            "maxtemp_c": 23.0,
                            "maxtemp_f": 73.4,
                            "daily_chance_of_rain": 30,
                            "condition": {
                                "text": "Sunny",
                                "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png",
                            },
                        },
                        "hour": [
                            {
                                "time": "2026-04-22 09:00",
                                "temp_c": 18.0,
                                "temp_f": 64.4,
                                "chance_of_rain": 10,
                                "condition": {
                                    "text": "Sunny",
                                    "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png",
                                },
                            },
                            {
                                "time": "2026-04-22 11:00",
                                "temp_c": 21.0,
                                "temp_f": 69.8,
                                "chance_of_rain": 20,
                                "condition": {
                                    "text": "Partly cloudy",
                                    "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
                                },
                            },
                        ],
                    },
                    {
                        "date": "2026-04-23",
                        "day": {
                            "mintemp_c": 11.0,
                            "mintemp_f": 51.8,
                            "maxtemp_c": 20.0,
                            "maxtemp_f": 68.0,
                            "daily_chance_of_rain": 40,
                            "condition": {
                                "text": "Cloudy",
                                "icon": "//cdn.weatherapi.com/weather/64x64/day/119.png",
                            },
                        },
                    },
                    {
                        "date": "2026-04-24",
                        "day": {
                            "mintemp_c": 10.0,
                            "mintemp_f": 50.0,
                            "maxtemp_c": 19.0,
                            "maxtemp_f": 66.2,
                            "daily_chance_of_rain": 50,
                            "condition": {
                                "text": "Light rain",
                                "icon": "//cdn.weatherapi.com/weather/64x64/day/296.png",
                            },
                        },
                    },
                    {
                        "date": "2026-04-25",
                        "day": {
                            "mintemp_c": 9.0,
                            "mintemp_f": 48.2,
                            "maxtemp_c": 18.0,
                            "maxtemp_f": 64.4,
                            "daily_chance_of_rain": 35,
                            "condition": {
                                "text": "Partly cloudy",
                                "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
                            },
                        },
                    },
                ]
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
        assert len(result.hourly_forecast) == 1
        assert result.hourly_forecast[0].time.hour == 11
        assert len(result.daily_forecast) == 3
        assert result.daily_forecast[0].date.day == 23

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
