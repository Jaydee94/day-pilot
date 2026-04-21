"""
Tests for the AI summary service.
"""
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytz
import pytest

from app.models.schemas import DailySummary, CalendarEvent, WeatherInfo, TodoItem, Birthday


BERLIN_TZ = pytz.timezone("Europe/Berlin")


def _make_summary() -> DailySummary:
    now = datetime.now(BERLIN_TZ)
    return DailySummary(
        date=now,
        events=[
            CalendarEvent(
                id="e1",
                title="Team Standup",
                start=now.replace(hour=9, minute=0),
                end=now.replace(hour=9, minute=30),
                source="google",
            )
        ],
        todos=[
            TodoItem(id="t1", title="Report abschließen", source="google")
        ],
        weather=WeatherInfo(
            city="Berlin",
            temperature=20.0,
            feels_like=19.0,
            description="sonnig",
            icon="01d",
            humidity=50,
            wind_speed=3.0,
            units="metric",
        ),
        birthdays=[Birthday(name="Max Mustermann", date=now, age=30)],
    )


class TestGenerateSummary:
    def test_returns_unchanged_when_no_api_key(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_API_KEY", "")
        from app.services.ai_summary import generate_summary

        summary = _make_summary()
        result = generate_summary(summary)
        assert result.ai_summary is None
        assert result.top_priorities == []

    def test_parses_openai_response(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.ai_summary.settings.OPENAI_API_KEY", "fake-key"
        )
        monkeypatch.setattr(
            "app.services.ai_summary.settings.OPENAI_MODEL", "gpt-4o-mini"
        )

        fake_text = (
            "ZUSAMMENFASSUNG:\nHeute wird ein produktiver Tag. Das Wetter ist schön.\n\n"
            "PRIORITÄTEN:\n1. Report abschließen\n2. Team Standup\n3. Sport machen"
        )

        mock_choice = MagicMock()
        mock_choice.message.content = fake_text
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]

        with patch("app.services.ai_summary.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_client.chat.completions.create.return_value = mock_completion
            mock_openai_cls.return_value = mock_client

            from app.services.ai_summary import generate_summary
            result = generate_summary(_make_summary())

        assert "produktiver Tag" in result.ai_summary
        assert len(result.top_priorities) == 3
        assert result.top_priorities[0] == "Report abschließen"

    def test_handles_openai_error_gracefully(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.ai_summary.settings.OPENAI_API_KEY", "fake-key"
        )

        with patch("app.services.ai_summary.OpenAI") as mock_openai_cls:
            mock_openai_cls.side_effect = Exception("API error")
            from app.services.ai_summary import generate_summary
            result = generate_summary(_make_summary())

        # Should not raise, just return original summary
        assert result is not None
