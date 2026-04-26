"""
Tests for the notifications service.
"""
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytz
import pytest

from app.models.schemas import DailySummary, WeatherInfo


BERLIN_TZ = pytz.timezone("Europe/Berlin")


def _make_summary():
    return DailySummary(
        date=datetime.now(BERLIN_TZ),
        weather=WeatherInfo(
            city="Berlin",
            temperature=18.0,
            feels_like=17.0,
            description="bewölkt",
            icon="04d",
            humidity=65,
            wind_speed=5.0,
            units="metric",
        ),
        ai_summary="Heute wird ein interessanter Tag!",
        top_priorities=["Report fertigstellen", "Meeting vorbereiten"],
    )


class TestSendDailyPush:
    def test_returns_false_when_no_topic(self, monkeypatch):
        monkeypatch.setattr("app.services.notifications.settings.NTFY_TOPIC", "")
        from app.services.notifications import send_daily_push
        result = send_daily_push(_make_summary())
        assert result is False

    def test_sends_push_on_success(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.notifications.settings.NTFY_TOPIC", "my-topic"
        )
        monkeypatch.setattr(
            "app.services.notifications.settings.NTFY_SERVER", "https://ntfy.sh"
        )
        monkeypatch.setattr(
            "app.services.notifications.settings.NTFY_TOKEN", ""
        )

        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()

        with patch("app.services.notifications.httpx.Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post.return_value = mock_resp
            mock_cls.return_value = mock_client

            from app.services.notifications import send_daily_push
            result = send_daily_push(_make_summary())

        assert result is True
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "my-topic" in call_args[0][0]
        headers = call_args[1]["headers"]
        headers["Title"].encode("ascii")

    def test_skips_duplicate_send_same_day(self, monkeypatch, tmp_path):
        dedup_file = str(tmp_path / "dedup.json")
        monkeypatch.setattr("app.services.notifications.settings.NTFY_TOPIC", "my-topic")
        monkeypatch.setattr("app.services.notifications.settings.NTFY_SERVER", "https://ntfy.sh")
        monkeypatch.setattr("app.services.notifications.settings.NTFY_TOKEN", "")
        monkeypatch.setattr("app.services.notifications.settings.NOTIFICATIONS_DEDUP_FILE", dedup_file)

        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()

        with patch("app.services.notifications.httpx.Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post.return_value = mock_resp
            mock_cls.return_value = mock_client

            from app.services.notifications import send_daily_push
            first = send_daily_push(_make_summary())
            second = send_daily_push(_make_summary())

        assert first is True
        assert second is False
        assert mock_client.post.call_count == 1

    def test_dedup_resets_next_day(self, monkeypatch, tmp_path):
        import json
        dedup_file = str(tmp_path / "dedup.json")
        # Write yesterday's date into the dedup file
        with open(dedup_file, "w") as f:
            json.dump({"date": "2000-01-01"}, f)
        monkeypatch.setattr("app.services.notifications.settings.NTFY_TOPIC", "my-topic")
        monkeypatch.setattr("app.services.notifications.settings.NTFY_SERVER", "https://ntfy.sh")
        monkeypatch.setattr("app.services.notifications.settings.NTFY_TOKEN", "")
        monkeypatch.setattr("app.services.notifications.settings.NOTIFICATIONS_DEDUP_FILE", dedup_file)

        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()

        with patch("app.services.notifications.httpx.Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post.return_value = mock_resp
            mock_cls.return_value = mock_client

            from app.services.notifications import send_daily_push
            result = send_daily_push(_make_summary())

        assert result is True
        mock_client.post.assert_called_once()

    def test_returns_false_on_http_error(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.notifications.settings.NTFY_TOPIC", "my-topic"
        )
        import httpx

        with patch("app.services.notifications.httpx.Client") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_response = MagicMock()
            mock_response.status_code = 403
            mock_client.post.return_value.raise_for_status.side_effect = (
                httpx.HTTPStatusError("Forbidden", request=MagicMock(), response=mock_response)
            )
            mock_cls.return_value = mock_client

            from app.services.notifications import send_daily_push
            result = send_daily_push(_make_summary())

        assert result is False
