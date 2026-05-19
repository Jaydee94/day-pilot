"""Logging helpers for Day Pilot.

Provides :func:`redact` which scrubs known secret formats from arbitrary
values before they are passed to a logger.  Used at the hottest logging sites
in ``settings_store``, ``settings_router`` and ``calendar_sync`` where
exception messages or paths can otherwise leak API keys / tokens.
"""
import re
from typing import Any

_SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_\-]{16,}"),            # OpenAI
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),              # GitHub PAT (classic)
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),      # GitHub fine-grained
    re.compile(r"gsk_[A-Za-z0-9]{20,}"),              # Groq
    re.compile(r"AIza[A-Za-z0-9_\-]{20,}"),           # Google AI
    re.compile(r"\b[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}\b"),  # Apple app-specific PW
]


def redact(value: Any) -> str:
    """Return ``str(value)`` with known secret patterns replaced by ``[REDACTED]``."""
    s = str(value)
    for pat in _SECRET_PATTERNS:
        s = pat.sub("[REDACTED]", s)
    return s
