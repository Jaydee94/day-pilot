"""
Tests for the weather service.
"""
from unittest.mock import patch, MagicMock
import pytest

from app.models.schemas import WeatherInfo


class TestFetchWeather:
    def test_returns_none_when_no_api_key(self, monkeypatch):
        monkeypatch.setattr("app.services.weather.settings.OPENWEATHERMAP_API_KEY", "")
        from app.services.weather import fetch_weather
        result = fetch_weather()
        assert result is None

    def test_returns_weather_info_on_success(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.weather.settings.OPENWEATHERMAP_API_KEY", "fake-key"
        )
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHER_CITY", "Berlin"
        )
        monkeypatch.setattr(
            "app.services.weather.settings.WEATHER_UNITS", "metric"
        )

        fake_response_data = {
            "name": "Berlin",
            "main": {
                "temp": 22.5,
                "feels_like": 21.0,
                "humidity": 55,
            },
            "weather": [{"description": "klarer Himmel", "icon": "01d"}],
            "wind": {"speed": 3.5},
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
        assert result.units == "metric"

    def test_returns_none_on_http_error(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.weather.settings.OPENWEATHERMAP_API_KEY", "fake-key"
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
