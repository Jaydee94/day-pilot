"""
AI summary service supporting multiple providers, all via the OpenAI-compatible SDK.

Provider selection is controlled by the ``AI_PROVIDER`` environment variable:
- ``openai``  (default) — requires ``OPENAI_API_KEY``
- ``github``            — requires ``GITHUB_TOKEN`` (GitHub PAT with ``models:read`` scope)
- ``groq``             — requires ``GROQ_API_KEY`` (free tier at console.groq.com)
- ``google``           — requires ``GOOGLE_AI_API_KEY`` (free tier at aistudio.google.com)

The model to use is read from ``AI_MODEL``.  When ``AI_MODEL`` is empty the
service falls back to the provider-specific default defined in ``_PROVIDER_DEFAULTS``.
"""
import logging
from typing import List, Optional

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore[assignment,misc]

from app.config import settings
from app.models.schemas import DailySummary, AIConfig, AIModelInfo

logger = logging.getLogger(__name__)

# Provider base URLs (all OpenAI-compatible)
_GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com"
_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

# Default model per provider when AI_MODEL is not configured
_PROVIDER_DEFAULTS = {
    "openai": "gpt-4o-mini",
    "github": "gpt-4o-mini",
    "groq": "llama-3.3-70b-versatile",
    "google": "gemini-2.0-flash",
}

# Well-known models available through the GitHub Models marketplace.
# This list is used when the models endpoint is unavailable.
_GITHUB_KNOWN_MODELS: List[AIModelInfo] = [
    AIModelInfo(id="gpt-4o", name="GPT-4o", provider="github"),
    AIModelInfo(id="gpt-4o-mini", name="GPT-4o mini", provider="github"),
    AIModelInfo(id="o1", name="o1", provider="github"),
    AIModelInfo(id="o1-mini", name="o1-mini", provider="github"),
    AIModelInfo(id="o3", name="o3", provider="github"),
    AIModelInfo(id="o3-mini", name="o3-mini", provider="github"),
    AIModelInfo(
        id="Meta-Llama-3.1-70B-Instruct",
        name="Meta Llama 3.1 70B Instruct",
        provider="github",
    ),
    AIModelInfo(
        id="Meta-Llama-3.1-405B-Instruct",
        name="Meta Llama 3.1 405B Instruct",
        provider="github",
    ),
    AIModelInfo(
        id="Mistral-large-2407",
        name="Mistral Large (2407)",
        provider="github",
    ),
    AIModelInfo(
        id="Mistral-small",
        name="Mistral Small",
        provider="github",
    ),
    AIModelInfo(
        id="Phi-3.5-MoE-instruct",
        name="Phi 3.5 MoE Instruct",
        provider="github",
    ),
    AIModelInfo(
        id="Phi-3.5-mini-instruct",
        name="Phi 3.5 Mini Instruct",
        provider="github",
    ),
]

_GROQ_KNOWN_MODELS: List[AIModelInfo] = [
    AIModelInfo(id="llama-3.3-70b-versatile", name="Llama 3.3 70B (free)", provider="groq"),
    AIModelInfo(id="llama-3.1-8b-instant", name="Llama 3.1 8B Instant (free)", provider="groq"),
    AIModelInfo(id="llama-3.2-11b-vision-preview", name="Llama 3.2 11B Vision (free)", provider="groq"),
    AIModelInfo(id="mixtral-8x7b-32768", name="Mixtral 8x7B (free)", provider="groq"),
    AIModelInfo(id="gemma2-9b-it", name="Gemma 2 9B (free)", provider="groq"),
]

_GOOGLE_KNOWN_MODELS: List[AIModelInfo] = [
    AIModelInfo(id="gemini-2.0-flash", name="Gemini 2.0 Flash (free)", provider="google"),
    AIModelInfo(id="gemini-2.0-flash-lite", name="Gemini 2.0 Flash Lite (free)", provider="google"),
    AIModelInfo(id="gemini-1.5-flash", name="Gemini 1.5 Flash (free)", provider="google"),
    AIModelInfo(id="gemini-1.5-flash-8b", name="Gemini 1.5 Flash-8B (free)", provider="google"),
    AIModelInfo(id="gemini-1.5-pro", name="Gemini 1.5 Pro", provider="google"),
]


def _resolve_model() -> str:
    """Return the model name to use, respecting AI_MODEL > legacy OPENAI_MODEL > provider default."""
    if settings.AI_MODEL:
        return settings.AI_MODEL
    if settings.AI_PROVIDER == "openai" and settings.OPENAI_MODEL:
        return settings.OPENAI_MODEL
    return _PROVIDER_DEFAULTS.get(settings.AI_PROVIDER, "gpt-4o-mini")


def _get_client() -> "OpenAI":  # type: ignore[name-defined]
    """Build the OpenAI-compatible client for the configured provider."""
    if settings.AI_PROVIDER == "github":
        return OpenAI(
            base_url=_GITHUB_MODELS_BASE_URL,
            api_key=settings.GITHUB_TOKEN,
        )
    if settings.AI_PROVIDER == "groq":
        return OpenAI(
            base_url=_GROQ_BASE_URL,
            api_key=settings.GROQ_API_KEY,
        )
    if settings.AI_PROVIDER == "google":
        return OpenAI(
            base_url=_GOOGLE_BASE_URL,
            api_key=settings.GOOGLE_AI_API_KEY,
        )
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def _is_configured() -> bool:
    """Return True when the required credential for the active provider is set."""
    if settings.AI_PROVIDER == "github":
        return bool(settings.GITHUB_TOKEN)
    if settings.AI_PROVIDER == "groq":
        return bool(settings.GROQ_API_KEY)
    if settings.AI_PROVIDER == "google":
        return bool(settings.GOOGLE_AI_API_KEY)
    return bool(settings.OPENAI_API_KEY)


def get_ai_config() -> AIConfig:
    """Return the current AI provider configuration."""
    return AIConfig(
        provider=settings.AI_PROVIDER,
        model=_resolve_model(),
        configured=_is_configured(),
    )


def list_models() -> List[AIModelInfo]:
    """
    Return models available for the configured provider.

    For the GitHub provider the list is fetched live from the models endpoint;
    if that call fails the built-in fallback list is returned instead.
    For Groq and Google the built-in curated lists are returned directly.
    For OpenAI an empty list is returned (users set the model via AI_MODEL).
    """
    provider = settings.AI_PROVIDER

    if provider == "groq":
        return _GROQ_KNOWN_MODELS if settings.GROQ_API_KEY else []

    if provider == "google":
        return _GOOGLE_KNOWN_MODELS if settings.GOOGLE_AI_API_KEY else []

    if provider != "github" or not settings.GITHUB_TOKEN:
        return []

    if OpenAI is None:
        return _GITHUB_KNOWN_MODELS

    try:
        client = _get_client()
        raw_models = client.models.list()
        return [
            AIModelInfo(id=m.id, name=m.id, provider="github")
            for m in raw_models.data
        ]
    except Exception as exc:
        logger.warning("Could not fetch GitHub Models list (%s) — using built-in list", exc)
        return _GITHUB_KNOWN_MODELS


def _build_prompt(summary: DailySummary) -> str:
    lines: List[str] = [
        f"Date: {summary.date.strftime('%A, %B %d, %Y')}",
        "",
    ]

    if summary.weather:
        w = summary.weather
        unit_sym = "°C" if w.units == "metric" else "°F"
        lines.append(
            f"Weather in {w.city}: {w.description}, {w.temperature}{unit_sym} "
            f"(feels like {w.feels_like}{unit_sym}), humidity {w.humidity}%, "
            f"wind {w.wind_speed} {'m/s' if w.units == 'metric' else 'mph'}"
        )
        lines.append("")

    if summary.birthdays:
        lines.append("Birthdays today:")
        for b in summary.birthdays:
            age_str = f" (turns {b.age})" if b.age else ""
            lines.append(f"  • {b.name}{age_str}")
        lines.append("")

    if summary.events:
        lines.append("Events today:")
        for ev in summary.events:
            time_str = ev.start.strftime("%H:%M")
            loc_str = f" @ {ev.location}" if ev.location else ""
            lines.append(f"  • {time_str} – {ev.title}{loc_str}")
        lines.append("")

    if summary.todos:
        lines.append("Tasks:")
        for td in summary.todos:
            due_str = f" (due: {td.due.strftime('%b %d')})" if td.due else ""
            lines.append(f"  • {td.title}{due_str}")
        lines.append("")

    data_text = "\n".join(lines)

    return (
        "You are a friendly personal assistant for a family. "
        "Based on the following data, write a warm, concise daily briefing in English "
        "(maximum 5 sentences, starting with 'Good morning'). "
        "Then extract the 3 most important priorities for the day as a numbered list.\n\n"
        "FORMAT:\nSUMMARY:\n<text>\n\nPRIORITIES:\n1. ...\n2. ...\n3. ...\n\n"
        f"DATA:\n{data_text}"
    )


def generate_summary(summary: DailySummary) -> DailySummary:
    """
    Call the configured AI provider to produce a narrative and top-3 priorities.
    Returns the enriched DailySummary (ai_summary + top_priorities filled in).
    """
    if not _is_configured():
        logger.warning(
            "AI provider '%s' is not configured (missing credential) – skipping AI summary",
            settings.AI_PROVIDER,
        )
        return summary

    if OpenAI is None:
        logger.warning("openai package not installed – skipping AI summary")
        return summary

    try:
        client = _get_client()
        model = _resolve_model()
        prompt = _build_prompt(summary)

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=512,
        )
        text: str = response.choices[0].message.content.strip()

        # Parse sections
        ai_text: Optional[str] = None
        priorities: List[str] = []

        if "SUMMARY:" in text and "PRIORITIES:" in text:
            parts = text.split("PRIORITIES:")
            ai_text = parts[0].replace("SUMMARY:", "").strip()
            prio_block = parts[1].strip()
            for line in prio_block.splitlines():
                line = line.strip()
                if line and line[0].isdigit():
                    # strip leading "1. " etc.
                    priorities.append(line.split(".", 1)[-1].strip())
        else:
            ai_text = text

        summary.ai_summary = ai_text
        summary.top_priorities = priorities[:3]
        return summary

    except Exception as exc:
        logger.error("Failed to generate AI summary: %s", exc)
        return summary
