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
    def setup_method(self):
        """Clear the AI summary cache before each test to avoid cross-test pollution."""
        from app.services.ai_summary import invalidate_ai_cache
        invalidate_ai_cache()

    def teardown_method(self):
        from app.services.ai_summary import invalidate_ai_cache
        invalidate_ai_cache()

    def test_returns_unchanged_when_no_api_key(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_API_KEY", "")
        monkeypatch.setattr("app.services.ai_summary.settings.GITHUB_TOKEN", "")
        from app.services.ai_summary import generate_summary

        summary = _make_summary()
        result = generate_summary(summary)
        assert result.ai_summary is None
        assert result.top_priorities == []

    def test_parses_openai_response(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr(
            "app.services.ai_summary.settings.OPENAI_API_KEY", "fake-key"
        )
        monkeypatch.setattr(
            "app.services.ai_summary.settings.OPENAI_MODEL", "gpt-4o-mini"
        )
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "")

        fake_text = (
            "SUMMARY:\nGood morning — today looks like a productive day. The weather is beautiful.\n\n"
            "PRIORITIES:\n1. Finish the report\n2. Team Standup\n3. Exercise"
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

        assert "productive day" in result.ai_summary
        assert len(result.top_priorities) == 3
        assert result.top_priorities[0] == "Finish the report"

    def test_handles_openai_error_gracefully(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr(
            "app.services.ai_summary.settings.OPENAI_API_KEY", "fake-key"
        )
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "")

        with patch("app.services.ai_summary.OpenAI") as mock_openai_cls:
            mock_openai_cls.side_effect = Exception("API error")
            from app.services.ai_summary import generate_summary
            result = generate_summary(_make_summary())

        # Should not raise, just return original summary
        assert result is not None

    def test_github_provider_uses_correct_base_url(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "github")
        monkeypatch.setattr("app.services.ai_summary.settings.GITHUB_TOKEN", "ghp_fake")
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "gpt-4o-mini")

        fake_text = (
            "SUMMARY:\nGood morning — all clear today.\n\n"
            "PRIORITIES:\n1. Stand-up\n2. Lunch\n3. Review"
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

            # Ensure OpenAI was instantiated with the GitHub base URL
            call_kwargs = mock_openai_cls.call_args.kwargs
            assert call_kwargs.get("base_url") == "https://models.inference.ai.azure.com"
            assert call_kwargs.get("api_key") == "ghp_fake"

        assert "all clear" in result.ai_summary
        assert len(result.top_priorities) == 3

    def test_github_provider_skips_when_no_token(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "github")
        monkeypatch.setattr("app.services.ai_summary.settings.GITHUB_TOKEN", "")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_API_KEY", "")

        from app.services.ai_summary import generate_summary
        result = generate_summary(_make_summary())
        assert result.ai_summary is None

    def test_ai_model_overrides_provider_default(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_API_KEY", "fake-key")
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "gpt-4o")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_MODEL", "gpt-4o-mini")

        fake_text = (
            "SUMMARY:\nGood morning — great day ahead.\n\n"
            "PRIORITIES:\n1. Deploy\n2. Review\n3. Sync"
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
            generate_summary(_make_summary())

            create_call = mock_client.chat.completions.create.call_args
            assert create_call.kwargs.get("model") == "gpt-4o"


class TestListModels:
    def test_returns_empty_for_openai_provider(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr("app.services.ai_summary.settings.GITHUB_TOKEN", "")
        from app.services.ai_summary import list_models
        assert list_models() == []

    def test_returns_empty_when_github_token_missing(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "github")
        monkeypatch.setattr("app.services.ai_summary.settings.GITHUB_TOKEN", "")
        from app.services.ai_summary import list_models
        assert list_models() == []

    def test_falls_back_to_known_models_on_api_error(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "github")
        monkeypatch.setattr("app.services.ai_summary.settings.GITHUB_TOKEN", "ghp_fake")

        with patch("app.services.ai_summary.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_client.models.list.side_effect = Exception("network error")
            mock_openai_cls.return_value = mock_client

            from app.services.ai_summary import list_models, _GITHUB_KNOWN_MODELS
            result = list_models()

        assert result == _GITHUB_KNOWN_MODELS

    def test_returns_live_models_from_api(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "github")
        monkeypatch.setattr("app.services.ai_summary.settings.GITHUB_TOKEN", "ghp_fake")

        fake_model = MagicMock()
        fake_model.id = "gpt-4o"
        fake_response = MagicMock()
        fake_response.data = [fake_model]

        with patch("app.services.ai_summary.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_client.models.list.return_value = fake_response
            mock_openai_cls.return_value = mock_client

            from app.services.ai_summary import list_models
            result = list_models()

        assert len(result) == 1
        assert result[0].id == "gpt-4o"
        assert result[0].provider == "github"


class TestGetAiConfig:
    def test_returns_openai_config(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_API_KEY", "key123")
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_MODEL", "gpt-4o-mini")

        from app.services.ai_summary import get_ai_config
        cfg = get_ai_config()
        assert cfg.provider == "openai"
        assert cfg.model == "gpt-4o-mini"
        assert cfg.configured is True

    def test_returns_github_config(self, monkeypatch):
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "github")
        monkeypatch.setattr("app.services.ai_summary.settings.GITHUB_TOKEN", "ghp_fake")
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "gpt-4o")

        from app.services.ai_summary import get_ai_config
        cfg = get_ai_config()
        assert cfg.provider == "github"
        assert cfg.model == "gpt-4o"
        assert cfg.configured is True


class TestAISummaryCache:
    """Verify that the daily AI summary cache prevents redundant AI API calls."""

    def setup_method(self):
        """Clear the AI summary cache before each test."""
        from app.services.ai_summary import invalidate_ai_cache
        invalidate_ai_cache()

    def teardown_method(self):
        """Clear cache after each test to avoid leaking state."""
        from app.services.ai_summary import invalidate_ai_cache
        invalidate_ai_cache()

    def test_second_call_does_not_hit_ai_api(self, monkeypatch):
        """generate_summary must return cached result on the second call without calling the AI."""
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_API_KEY", "fake-key")
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "gpt-4o-mini")

        fake_text = (
            "SUMMARY:\nGood morning — a great day ahead.\n\n"
            "PRIORITIES:\n1. Task A\n2. Task B\n3. Task C"
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
            # First call – AI is invoked
            result1 = generate_summary(_make_summary())
            # Second call same day – must use cache, AI NOT invoked again
            result2 = generate_summary(_make_summary())

        assert mock_client.chat.completions.create.call_count == 1
        assert result1.ai_summary == result2.ai_summary

    def test_invalidate_cache_forces_fresh_ai_call(self, monkeypatch):
        """After invalidation generate_summary must call the AI again."""
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_API_KEY", "fake-key")
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "gpt-4o-mini")

        fake_text = (
            "SUMMARY:\nGood morning — fresh briefing.\n\n"
            "PRIORITIES:\n1. X\n2. Y\n3. Z"
        )
        mock_choice = MagicMock()
        mock_choice.message.content = fake_text
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]

        with patch("app.services.ai_summary.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_client.chat.completions.create.return_value = mock_completion
            mock_openai_cls.return_value = mock_client

            from app.services.ai_summary import generate_summary, invalidate_ai_cache
            generate_summary(_make_summary())   # first call – cached
            invalidate_ai_cache()               # clear cache
            generate_summary(_make_summary())   # second call – fresh AI call

        assert mock_client.chat.completions.create.call_count == 2

    def test_cache_populated_after_successful_call(self, monkeypatch):
        """_ai_summary_cache must contain the result after a successful AI call."""
        monkeypatch.setattr("app.services.ai_summary.settings.AI_PROVIDER", "openai")
        monkeypatch.setattr("app.services.ai_summary.settings.OPENAI_API_KEY", "fake-key")
        monkeypatch.setattr("app.services.ai_summary.settings.AI_MODEL", "gpt-4o-mini")

        fake_text = (
            "SUMMARY:\nGood morning.\n\n"
            "PRIORITIES:\n1. Alpha\n2. Beta\n3. Gamma"
        )
        mock_choice = MagicMock()
        mock_choice.message.content = fake_text
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]

        with patch("app.services.ai_summary.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_client.chat.completions.create.return_value = mock_completion
            mock_openai_cls.return_value = mock_client

            from app.services.ai_summary import generate_summary, _ai_summary_cache
            summary = _make_summary()
            generate_summary(summary)
            key = summary.date.strftime("%Y-%m-%d")

        assert key in _ai_summary_cache
        assert _ai_summary_cache[key]["ai_summary"] is not None
        assert len(_ai_summary_cache[key]["top_priorities"]) == 3
